import type { NextFunction, Request, RequestHandler, Response } from "express";
import crypto from "crypto";
import { toBoolean } from "validator";
import {
  cache,
  invalidateAllCache,
  invalidateModelCache,
  registerModelCacheKey,
} from "../config/cache";
import { logger } from "../config/logger";

type CacheInvalidationOptions = {
  invalidateAll?: boolean;
  statusCodes?: number[];
  methods?: string[];
  logLabel?: string;
};

type CacheResponseOptions = {
  ttlSeconds?: number;
  varyByUser?: boolean;
  logLabel?: string;
  enabled?: boolean;
};

type GlobalCacheOptions = {
  ttlSeconds?: number;
  enabled?: boolean;
  varyByAuthorization?: boolean;
  methods?: string[];
  logLabel?: string;
  skipPaths?: (string | RegExp)[];
};

const DEFAULT_MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const DEFAULT_CACHE_METHODS = new Set(["GET"]);
const DEFAULT_GLOBAL_CACHE_METHODS = new Set(["GET"]);

const stableSortValue = (value: any): any => {
  if (Array.isArray(value)) return value.map((item) => stableSortValue(item));
  if (!value || typeof value !== "object" || value instanceof Date) return value;

  return Object.keys(value)
    .sort()
    .reduce((acc: Record<string, any>, key: string) => {
      acc[key] = stableSortValue(value[key]);
      return acc;
    }, {});
};

const buildCacheKey = (
  prefix: string,
  req: Request,
  options: CacheResponseOptions
): string => {
  const authUser = (req as any)?.user ?? {};
  const userScope = options.varyByUser
    ? {
        userId: authUser?._id || authUser?.id || "",
        role: authUser?.role || "",
      }
    : {
        userId: "",
        role: "",
      };

  const payload = {
    prefix,
    method: req.method,
    path: req.path,
    query: stableSortValue({ ...(req.query ?? {}), isCached: undefined }),
    ...userScope,
  };

  return crypto.createHash("sha1").update(JSON.stringify(payload)).digest("hex");
};

const normalizeModelNames = (modelNames: string | string[]): string[] =>
  Array.isArray(modelNames) ? modelNames : [modelNames];

const shouldUseCache = (req: Request): boolean => {
  const isCached = (req.query as any)?.isCached;
  return isCached === undefined ? true : toBoolean(String(isCached));
};

const shouldSkipPath = (pathname: string, skipPaths: (string | RegExp)[] = []): boolean =>
  skipPaths.some((pattern) =>
    typeof pattern === "string" ? pathname.startsWith(pattern) : pattern.test(pathname)
  );

const buildGlobalCacheKey = (
  req: Request,
  options: GlobalCacheOptions
): string => {
  const authorization = String(req.header("Authorization") || "");
  const cacheScope = options.varyByAuthorization
    ? {
        authHash: authorization
          ? crypto.createHash("sha1").update(authorization).digest("hex")
          : "",
      }
    : {
        authHash: "",
      };

  const payload = {
    method: req.method,
    path: req.path,
    query: stableSortValue({ ...(req.query ?? {}), isCached: undefined }),
    ...cacheScope,
  };

  return crypto.createHash("sha1").update(JSON.stringify(payload)).digest("hex");
};

const markCachedInPayload = (body: any): any => {
  if (!body || typeof body !== "object") return body;

  const cloned = Array.isArray(body) ? [...body] : { ...body };
  cloned.isCached = true;

  if (cloned.data && typeof cloned.data === "object") {
    cloned.data = Array.isArray(cloned.data)
      ? cloned.data.map((item: any) =>
          item && typeof item === "object" ? { ...item, isCached: true } : item,
        )
      : { ...cloned.data, isCached: true };
  }

  return cloned;
};

export const cacheGetResponse = (
  cachePrefix: string,
  options: CacheResponseOptions = {}
): RequestHandler => {
  const enabled = options.enabled ?? true;

  return (req: Request, res: Response, next: NextFunction) => {
    if (!enabled || !DEFAULT_CACHE_METHODS.has(req.method.toUpperCase())) {
      return next();
    }

    if (!shouldUseCache(req)) {
      return next();
    }

    const cacheKey = buildCacheKey(cachePrefix, req, options);
    const cachedResponse = cache.get<any>(cacheKey);

    if (cachedResponse) {
      // logger.info(
      //   `[CacheMiddleware] cache-hit ${JSON.stringify({
      //     method: req.method,
      //     url: req.originalUrl,
      //     cachePrefix,
      //     cacheKey,
      //     logLabel: options.logLabel ?? "",
      //   })}`
      // );
      return res.status(cachedResponse.statusCode ?? 200).json({
        ...markCachedInPayload(cachedResponse.body),
      });
    }

    const originalJson = res.json.bind(res);

    res.json = ((body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, {
          statusCode: res.statusCode,
          body,
        }, options.ttlSeconds ?? 300);
        registerModelCacheKey(cachePrefix, cacheKey);

        // logger.info(
        //   `[CacheMiddleware] cache-store ${JSON.stringify({
        //     method: req.method,
        //     url: req.originalUrl,
        //     cachePrefix,
        //     cacheKey,
        //     statusCode: res.statusCode,
        //     logLabel: options.logLabel ?? "",
        //   })}`
        // );
      }

      return originalJson(body);
    }) as any;

    next();
  };
};

export const cacheGlobalGetResponses = (
  options: GlobalCacheOptions = {}
): RequestHandler => {
  const enabled = options.enabled ?? true;
  const ttlSeconds = options.ttlSeconds ?? 300;
  const methods = new Set((options.methods ?? Array.from(DEFAULT_GLOBAL_CACHE_METHODS)).map((method) => method.toUpperCase()));
  const skipPaths = options.skipPaths ?? [];

  return (req: Request, res: Response, next: NextFunction) => {
    if (!enabled || !methods.has(req.method.toUpperCase())) {
      return next();
    }

    if (shouldSkipPath(req.path, skipPaths)) {
      return next();
    }

    res.once("finish", () => {
      const methodAllowed = DEFAULT_MUTATION_METHODS.has(req.method.toUpperCase());
      const statusAllowed = res.statusCode >= 200 && res.statusCode < 300;

      if (!methodAllowed || !statusAllowed) return;

      try {
        invalidateAllCache();
      } catch (error: any) {
        logger.error(
          `[CacheMiddleware] global-invalidation-failed ${JSON.stringify({
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            error: error?.message || String(error),
            logLabel: options.logLabel ?? "",
          })}`
        );
      }
    });

    if (!shouldUseCache(req)) {
      return next();
    }

    const cacheKey = buildGlobalCacheKey(req, options);
    const cachedResponse = cache.get<any>(cacheKey);

    if (cachedResponse) {
      return res.status(cachedResponse.statusCode ?? 200).json({
        ...markCachedInPayload(cachedResponse.body),
      });
    }

    const originalJson = res.json.bind(res);

    res.json = ((body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(
          cacheKey,
          {
            statusCode: res.statusCode,
            body,
          },
          ttlSeconds
        );
      }

      return originalJson(body);
    }) as any;

    next();
  };
};

export const invalidateCacheAfterSuccess = (
  modelNames?: string | string[],
  options: CacheInvalidationOptions = {}
): RequestHandler => {
  const normalizedModelNames = modelNames
    ? normalizeModelNames(modelNames).filter(Boolean)
    : [];

  return (_req: Request, res: Response, next: NextFunction) => {
    res.once("finish", () => {
      const methodAllowed = options.methods?.length
        ? options.methods.map((method) => method.toUpperCase()).includes(_req.method.toUpperCase())
        : DEFAULT_MUTATION_METHODS.has(_req.method.toUpperCase());

      const statusAllowed = options.statusCodes?.length
        ? options.statusCodes.includes(res.statusCode)
        : res.statusCode >= 200 && res.statusCode < 300;

      if (!methodAllowed || !statusAllowed) return;

      try {
        if (options.invalidateAll) {
          invalidateAllCache();
          logger.info(
            `[CacheMiddleware] invalidated-all ${JSON.stringify({
              method: _req.method,
              url: _req.originalUrl,
              statusCode: res.statusCode,
              logLabel: options.logLabel ?? "",
            })}`
          );
          return;
        }

        if (normalizedModelNames.length === 0) return;

        const invalidatedModels: string[] = [];
        for (const modelName of normalizedModelNames) {
          invalidateModelCache(modelName);
          invalidatedModels.push(modelName);
        }

        logger.info(
          `[CacheMiddleware] invalidated-models ${JSON.stringify({
            method: _req.method,
            url: _req.originalUrl,
            statusCode: res.statusCode,
            models: invalidatedModels,
            logLabel: options.logLabel ?? "",
          })}`
        );
      } catch (error: any) {
        logger.error(
          `[CacheMiddleware] invalidation-failed ${JSON.stringify({
            method: _req.method,
            url: _req.originalUrl,
            statusCode: res.statusCode,
            error: error?.message || String(error),
            logLabel: options.logLabel ?? "",
          })}`
        );
      }
    });

    next();
  };
};
