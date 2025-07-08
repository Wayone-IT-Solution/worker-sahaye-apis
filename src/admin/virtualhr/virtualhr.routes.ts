// Virtualhr Routes
import express from "express";
import {
  createVirtualhr,
  getAllVirtualhrs,
  getVirtualhrById,
  updateVirtualhrById,
  deleteVirtualhrById,
} from "./virtualhr.controller";

const router = express.Router();

router
  .post("/", createVirtualhr)
  .get("/", getAllVirtualhrs)
  .get("/:id", getVirtualhrById)
  .put("/:id", updateVirtualhrById)
  .delete("/:id", deleteVirtualhrById);

export default router;
