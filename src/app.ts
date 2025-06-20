import "colors";
import path from "path";
import cors from "cors";
import colors from "colors";
import helmet from "helmet";
import express from "express";
import routes from "./routes";
import { logger } from "./config/logger";
import { config } from "./config/config";
import { limiter } from "./middlewares/limiter";
import { corsOptions } from "./middlewares/corsMiddleware";
import { activityLogger } from "./middlewares/activityLogger";
import { notFoundHandler } from "./middlewares/notFounHandler";
import { globalErrorHandler } from "./middlewares/errorHandler";

const app = express();

// Middleware
app.use(helmet());
if (config.cors.enabled) app.use(cors(corsOptions));
else console.log("⚠️  CORS is disabled by config");

if (config.security.rateLimitEnabled) {
  app.set("trust proxy", true);
  app.use(limiter);
  console.log("✅ Rate limiter enabled");
}

// Middleware for parsing JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging Middleware
app.use(
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const startTime = process.hrtime();
    res.on("finish", () => {
      const fetchStatus = () => {
        if (res.statusCode >= 500) return colors.red(`${res.statusCode}`);
        else if (res.statusCode >= 400)
          return colors.yellow(`${res.statusCode}`);
        else if (res.statusCode >= 300) return colors.cyan(`${res.statusCode}`);
        else if (res.statusCode >= 200)
          return colors.green(`${res.statusCode}`);
        else return colors.white(`${res.statusCode}`);
      };
      const diff = process.hrtime(startTime);
      const responseTime = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
      logger.info(
        `${"METHOD:".blue} ${req.method.yellow} - ${"URL:".blue} ${
          req.originalUrl.yellow
        } - ${"STATUS:".blue} ${fetchStatus()} - ${"Response Time:".blue} ${
          responseTime.magenta
        } ${"ms".magenta}`
      );
    });
    next();
  }
);

// Handle activity logger
app.use(activityLogger);

// Handle Public API Routes
app.use("/api", routes);

// Handle Get Images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Handle 404 errors
app.use(notFoundHandler);

// Handle global errors
app.use(globalErrorHandler);

export default app;
