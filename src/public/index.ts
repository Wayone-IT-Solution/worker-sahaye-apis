/**
 * ===============================================
 * 🌐 Dynamic Recursive Route Loader (routes/index)
 * ===============================================
 * Automatically discovers all `*.routes.ts` files inside nested folders.
 * Registers them with a base path inferred from the folder name.
 */

import { Router } from "express";
import { registerRoutesRecursively } from "../config/route";

const router = Router();

registerRoutesRecursively(__dirname);

export default router;
