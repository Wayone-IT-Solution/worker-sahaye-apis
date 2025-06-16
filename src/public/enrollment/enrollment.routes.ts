import express from "express";
import {
  createEnrollment,
  getAllEnrollments,
  getEnrollmentById,
  updateEnrollmentById,
  deleteEnrollmentById,
} from "./enrollment.controller";

const router = express.Router();

router
  .post("/", createEnrollment)
  .get("/", getAllEnrollments)
  .get("/:id", getEnrollmentById)
  .put("/:id", updateEnrollmentById)
  .delete("/:id", deleteEnrollmentById);

export default router;
