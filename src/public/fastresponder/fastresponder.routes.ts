import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { FastResponderController } from "./fastresponder.controller";
import { allowAllExcept, authenticateToken, isAdmin } from "../../middlewares/authMiddleware";

const {
  createFastResponder,
  getAllFastResponders,
  getFastResponderById,
  updateFastResponderById,
  deleteFastResponderById,
  getFastResponderDetails
} = FastResponderController;

const router = express.Router();

router
  .get("/:userType",
    authenticateToken,
    isAdmin,
    asyncHandler(getAllFastResponders))
  .get("/:userType/:id", authenticateToken, isAdmin, asyncHandler(getFastResponderById))
  .put("/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(updateFastResponderById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deleteFastResponderById))
  .post("/",
    authenticateToken,
    allowAllExcept(["admin", "agent"] as any),
    asyncHandler(createFastResponder))
  .patch("/",
    authenticateToken,
    allowAllExcept(["admin", "agent"] as any),
    asyncHandler(getFastResponderDetails));

export default router;
