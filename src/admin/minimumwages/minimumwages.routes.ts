import { Router } from "express";
import { MinimumWageController } from "./minimumwages.controller";

const router = Router();

// Get all wage structures with pagination
router.get("/", MinimumWageController.getAllWages);

// Get wage data by state
router.get("/:state", MinimumWageController.getWageByState);

// Create wage structure for a state
router.post("/", MinimumWageController.createWageStructure);

// Update columns for a state
router.put("/:state/columns", MinimumWageController.updateColumns);

// Add single wage row
router.post("/:state/rows", MinimumWageController.addWageRow);

// Add multiple wage rows
router.post("/:state/rows/bulk", MinimumWageController.addMultipleWageRows);

// Update a wage row
router.put("/:state/rows/:rowIndex", MinimumWageController.updateWageRow);

// Delete a wage row
router.delete("/:state/rows/:rowIndex", MinimumWageController.deleteWageRow);

// Delete entire wage structure
router.delete("/:state", MinimumWageController.deleteWageStructure);

export default router;
