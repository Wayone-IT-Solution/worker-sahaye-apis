import express from "express";
import { TradeController } from "./trade.controller";
import { asyncHandler } from "../../utils/asyncHandler";

const {
  createTrade,
  getAllTrades,
  getTradeById,
  createAllTrade,
  updateTradeById,
  deleteTradeById,
} = TradeController;

const router = express.Router();

router
  .post("/", asyncHandler(createTrade))
  .get("/", asyncHandler(getAllTrades))
  .get("/:id", asyncHandler(getTradeById))
  .post("/all", asyncHandler(createAllTrade))
  .put("/:id", asyncHandler(updateTradeById))
  .delete("/:id", asyncHandler(deleteTradeById));

export default router;
