/**
 * ===============================================
 * 🌐 Dynamic Recursive Route Loader (routes/index)
 * ===============================================
 * Automatically discovers all `*.routes.ts` files inside nested folders.
 * Registers them with a base path inferred from the folder name.
 */

import fs from "fs";
import path from "path";
import { Router } from "express";
import { config } from "../config/config";

const router = Router();

export const registerRoutesRecursively = (dir: string) => {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      registerRoutesRecursively(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".routes.ts")) {
      try {
        const routeModule = require(fullPath);
        const routeExport = routeModule.default;

        if (routeExport && typeof routeExport === "function") {
          const folderName = path.basename(path.dirname(fullPath));
          router.use(`/${folderName}`, routeExport);
          if (config.env === "development")
            console.info(`✅ Mounted /${folderName} → ${entry.name}`);
        } else
          console.warn(`⚠️  Skipped ${entry.name}: No valid default export`);
      } catch (err) {
        console.error(`❌ Failed to register ${entry.name}:`, err);
      }
    }
  });
};

export default router;
