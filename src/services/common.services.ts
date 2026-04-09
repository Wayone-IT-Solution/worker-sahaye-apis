import { toBoolean } from "validator";
import ApiError from "../utils/ApiError";
import { getPipeline } from "../utils/helper";
import { Model, Document, UpdateQuery } from "mongoose";
import { logger } from "../config/logger";

const parsePositiveInt = (value: any, fallback: number): number => {
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
};

const toDebugBoolean = (value: any): boolean => {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null || value === "") return false;
  return toBoolean(String(value));
};

const safeJSONStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
};

const NON_FILTER_QUERY_KEYS = new Set([
  "page",
  "limit",
  "pagination",
  "countMode",
  "search",
  "searchkey",
  "searchOperator",
  "searchMode",
  "multiSort",
  "sortDir",
  "sortKey",
  "fields",
  "exclude",
  "exists",
  "notExists",
  "applyCollation",
  "debug",
  "debugPipeline",
  "requestId",
  "traceId",
]);

const getFilterKeys = (query: Record<string, any>): string[] =>
  Object.keys(query ?? {}).filter((key) => !NON_FILTER_QUERY_KEYS.has(key));

const getStageNames = (pipeline: any[]): string[] =>
  (pipeline ?? []).map((stage: Record<string, any>) => Object.keys(stage ?? {})[0] || "unknown");

export class CommonService<T extends Document> {
  private model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  async create(data: Partial<T>) {
    try {
      const created = await this.model.create(data);
      return created;
    } catch (error: any) {
      throw error;
    }
  }

  async getById(id: string, populate: boolean = true) {
    try {
      const query = this.model.findById(id);
      if (populate) {
        const schemaPaths = this.model.schema.paths;
        Object.keys(schemaPaths).forEach((key) => {
          const path = schemaPaths[key];
          if ((path as any).options?.ref) {
            query.populate(key);
          }
        });
      }
      const result = await query;
      if (!result) throw new Error("Record not found");
      return result;
    } catch (error) {
      throw error;
    }
  }

  async getAll(query: any = {}, optionsToBeExtract?: any) {
    const modelName = this.model.modelName || "UnknownModel";
    const traceRef = String(query?.traceId || query?.requestId || "n/a");
    const debugEnabled =
      toDebugBoolean(query?.debugPipeline) ||
      toDebugBoolean(query?.debug) ||
      toDebugBoolean(process.env.COMMON_SERVICE_DEBUG);
    const startedAt = process.hrtime.bigint();

    try {
      const { pipeline, options, countPipeline } = getPipeline(
        query,
        optionsToBeExtract
      );
      const usePagination = toBoolean(String(query.pagination ?? "true"));
      const page = parsePositiveInt(query.page, 1);
      const limit = parsePositiveInt(query.limit, 10);

      if (debugEnabled) {
        logger.info(
          `[CommonService:getAll][model:${modelName}][trace:${traceRef}] Query summary | ${safeJSONStringify({
            pagination: usePagination,
            page,
            limit,
            filterKeys: getFilterKeys(query),
            search: query?.search ?? "",
            searchkey: query?.searchkey ?? "",
            searchOperator: query?.searchOperator ?? "or",
            searchMode: query?.searchMode ?? "contains",
            additionalStagesCount: Array.isArray(optionsToBeExtract)
              ? optionsToBeExtract.length
              : optionsToBeExtract
                ? 1
                : 0,
          })}`
        );
        logger.info(
          `[CommonService:getAll][model:${modelName}][trace:${traceRef}] Pipeline stages | ${safeJSONStringify(
            getStageNames(pipeline)
          )}`
        );
      }

      // Optimization: run data query and count query in parallel
      const aggregateStartedAt = process.hrtime.bigint();

      let data: any[];
      let totalItems: number = 0;

      if (usePagination) {
        const effectiveCountPipeline =
          Array.isArray(countPipeline) && countPipeline.length > 0
            ? countPipeline
            : [{ $count: "total" }];

        if (debugEnabled) {
          logger.info(
            `[CommonService:getAll][model:${modelName}][trace:${traceRef}] Count pipeline stages | ${safeJSONStringify(
              getStageNames(effectiveCountPipeline)
            )}`
          );
        }

        const [result, count] = await Promise.all([
          this.model.aggregate(pipeline, options),
          this.model.aggregate(effectiveCountPipeline, options),
        ]);

        data = Array.isArray(result) ? result : [];
        totalItems = count?.[0]?.total ?? 0;
      } else {
        data = await this.model.aggregate(pipeline, options);
      }

      const aggregateDurationMs =
        Number(process.hrtime.bigint() - aggregateStartedAt) / 1_000_000;
      const totalDurationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

      if (totalDurationMs > 1000) {
        logger.warn(
          `[CommonService:getAll][model:${modelName}][trace:${traceRef}] Slow query detected (${totalDurationMs.toFixed(
            2
          )} ms)`
        );
      }

      // Handle pagination
      if (usePagination) {
        const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 0;

        if (debugEnabled) {
          logger.info(
            `[CommonService:getAll][model:${modelName}][trace:${traceRef}] Search debug | ${safeJSONStringify({
              search: query?.search ?? "",
              searchkey: query?.searchkey ?? "",
              searchOperator: query?.searchOperator ?? "or",
              searchMode: query?.searchMode ?? "contains",
            })}`
          );
          logger.info(
            `[CommonService:getAll][model:${modelName}][trace:${traceRef}] Aggregation result | ${safeJSONStringify({
              returnedItems: data.length,
              totalItems,
              totalPages,
              aggregateDurationMs: Number(aggregateDurationMs.toFixed(2)),
              totalDurationMs: Number(totalDurationMs.toFixed(2)),
            })}`
          );
        }

        return {
          result: data,
          pagination: {
            totalItems,
            totalPages,
            currentPage: page,
            itemsPerPage: limit,
          },
        };
      }

      if (debugEnabled) {
        logger.info(
          `[CommonService:getAll][model:${modelName}][trace:${traceRef}] Non-paginated result | ${safeJSONStringify({
            resultCount: Array.isArray(data) ? data.length : 0,
            aggregateDurationMs: Number(aggregateDurationMs.toFixed(2)),
            totalDurationMs: Number(totalDurationMs.toFixed(2)),
          })}`
        );
      }

      return data;
    } catch (error: any) {
      if (debugEnabled) {
        logger.error(
          `[CommonService:getAll][model:${modelName}][trace:${traceRef}] Failed | ${error?.message || error}`
        );
      }
      throw new ApiError(500, error.message || "Failed to fetch data");
    }
  }

  async updateById(id: string, update: UpdateQuery<T>) {
    try {
      const updated = await this.model.findByIdAndUpdate(id, update, {
        new: true,
        runValidators: true,
      });
      if (!updated) throw new Error("Record not found for update");
      return updated;
    } catch (error) {
      throw error;
    }
  }

  async deleteById(id: string) {
    try {
      const deleted = await this.model.findByIdAndDelete(id);
      if (!deleted) throw new Error("Record not found for delete");
      return deleted;
    } catch (error) {
      throw error;
    }
  }
}
