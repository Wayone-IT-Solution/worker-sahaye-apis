// Preinterviewd Routes
import express from "express";
import {
  createPreinterviewd,
  getAllPreinterviewds,
  getPreinterviewdById,
  updatePreinterviewdById,
  deletePreinterviewdById,
} from "./preinterviewd.controller";

const router = express.Router();

router
  .post("/", createPreinterviewd)
  .get("/", getAllPreinterviewds)
  .get("/:id", getPreinterviewdById)
  .put("/:id", updatePreinterviewdById)
  .delete("/:id", deletePreinterviewdById);

export default router;
