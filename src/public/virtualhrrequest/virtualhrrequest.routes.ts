// Virtualhrrequest Routes
import express from "express";
import {
  createVirtualhrrequest,
  getAllVirtualhrrequests,
  getVirtualhrrequestById,
  updateVirtualhrrequestById,
  deleteVirtualhrrequestById,
} from "./virtualhrrequest.controller";

const router = express.Router();

router
  .post("/", createVirtualhrrequest)
  .get("/", getAllVirtualhrrequests)
  .get("/:id", getVirtualhrrequestById)
  .put("/:id", updateVirtualhrrequestById)
  .delete("/:id", deleteVirtualhrrequestById);

export default router;
