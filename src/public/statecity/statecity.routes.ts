import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { StateCityController } from "./statecity.controller";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const { createStateCity, getAllStateCitys, getAllCity, getAllStates, createState, getStateById, updateStateById, deleteStateById, createCity, updateCityById, getCityById, deleteCityById } = StateCityController;

const router = express.Router();

router
  .post("/", authenticateToken, asyncHandler(createStateCity))
  .get("/", authenticateToken, asyncHandler(getAllStateCitys))
  .get("/city", authenticateToken, asyncHandler(getAllCity))
  .post("/city", authenticateToken, asyncHandler(createCity))
  .get("/city/:id", authenticateToken, asyncHandler(getCityById))
  .put("/city/:id", authenticateToken, asyncHandler(updateCityById))
  .delete("/city/:id", authenticateToken, asyncHandler(deleteCityById))
  .get("/state", authenticateToken, asyncHandler(getAllStates))
  .post("/state", authenticateToken, asyncHandler(createState))
  .get("/state/:id", authenticateToken, asyncHandler(getStateById))
  .put("/state/:id", authenticateToken, asyncHandler(updateStateById))
  .delete("/state/:id", authenticateToken, asyncHandler(deleteStateById));

export default router;