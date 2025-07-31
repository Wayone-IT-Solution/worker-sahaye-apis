import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { SalesPersonController } from "./salesperson.controller";
import { authenticateToken } from "../../middlewares/authMiddleware";

const {
  createSalesPerson,
  getAllSalesPersons,
  getSalesPersonById,
  updateSalesPersonById,
  deleteSalesPersonById,
} = SalesPersonController;

const router = express.Router();

router
  .post("/", authenticateToken, asyncHandler(createSalesPerson))
  .get("/", authenticateToken, asyncHandler(getAllSalesPersons))
  .get("/:id", authenticateToken, asyncHandler(getSalesPersonById))
  .put("/:id", authenticateToken, asyncHandler(updateSalesPersonById))
  .delete("/:id", authenticateToken, asyncHandler(deleteSalesPersonById))

export default router;
