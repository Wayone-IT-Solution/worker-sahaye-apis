/**
 * ===============================================
 * 🌐 Auto Route Loader (src/routes/index.ts)
 * ===============================================
 * Loads *.routes.ts from admin/ and public/ folders,
 * preserving folder structure in route path.
 */

import fs from "fs";
import path from "path";
import { Router } from "express";
import { config } from "../config/config";

const router = Router();

// Get full route path like /admin/job
const getRoutePath = (baseDir: string, filePath: string): string => {
  const relativePath = path
    .dirname(filePath)
    .replace(baseDir, "")
    .split(path.sep)
    .filter(Boolean)
    .join("/");

  const baseFolderName = path.basename(baseDir);
  return `/${baseFolderName}${relativePath ? `/${relativePath}` : ""}`;
};

// Register routes recursively from a base folder
const registerRoutesRecursively = (baseDir: string) => {
  fs.readdirSync(baseDir, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(baseDir, entry.name);

    if (entry.isDirectory()) {
      registerRoutesRecursively(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".routes.ts")) {
      try {
        const routeModule = require(fullPath);
        const routeExport = routeModule.default;

        if (routeExport && typeof routeExport === "function") {
          const routePath = getRoutePath(baseDir, fullPath);
          router.use(routePath, routeExport);

          if (config.env === "development")
            console.info(`✅ Mounted /api${routePath} → ${entry.name}`);
        } else
          console.warn(`⚠️ Skipped ${entry.name}: No valid default export`);
      } catch (err) {
        console.error(`❌ Failed to register ${entry.name}:`, err);
      }
    }
  });
};

// Paths for admin and public
const srcPath = path.resolve(__dirname, "..");
registerRoutesRecursively(path.join(srcPath, "admin"));
registerRoutesRecursively(path.join(srcPath, "public"));

export default router;
