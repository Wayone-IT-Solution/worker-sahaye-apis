// Projectbasedhiring Routes
import express from "express";
import {
  createProjectbasedhiring,
  getAllProjectbasedhirings,
  getProjectbasedhiringById,
  updateProjectbasedhiringById,
  deleteProjectbasedhiringById,
} from "./projectbasedhiring.controller";

const router = express.Router();

router
  .post("/", createProjectbasedhiring)
  .get("/", getAllProjectbasedhirings)
  .get("/:id", getProjectbasedhiringById)
  .put("/:id", updateProjectbasedhiringById)
  .delete("/:id", deleteProjectbasedhiringById);

export default router;
