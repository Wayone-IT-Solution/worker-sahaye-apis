import { Router } from "express";
import { BadgeBundleController } from "./badgeBundle.controller";

const router = Router();

// Create a new badge bundle
router.post("/", BadgeBundleController.create);

// Get all badge bundles (supports query filters & pagination)
router.get("/", BadgeBundleController.getAll);

// Get a single badge bundle by ID
router.get("/:id", BadgeBundleController.getById);

// Update a badge bundle by ID
router.put("/:id", BadgeBundleController.updateById);

// Delete a badge bundle by ID
router.delete("/:id", BadgeBundleController.deleteById);

export default router;
