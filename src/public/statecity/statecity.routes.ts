import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { StateCityController } from "./statecity.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const { createStateCity, getAllStateCitys } = StateCityController;

const router = express.Router();

router
  .post("/", authenticateToken, isAdmin, asyncHandler(createStateCity))
  .get("/", authenticateToken, isAdmin, asyncHandler(getAllStateCitys));

export default router;
