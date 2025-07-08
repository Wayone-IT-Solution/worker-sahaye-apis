// Bulkhiring Routes
import express from "express";
import {
  createBulkhiring,
  getAllBulkhirings,
  getBulkhiringById,
  updateBulkhiringById,
  deleteBulkhiringById,
} from "./bulkhiring.controller";

const router = express.Router();

router
  .post("/", createBulkhiring)
  .get("/", getAllBulkhirings)
  .get("/:id", getBulkhiringById)
  .put("/:id", updateBulkhiringById)
  .delete("/:id", deleteBulkhiringById);

export default router;
