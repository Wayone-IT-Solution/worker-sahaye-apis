import express from "express";
import { HeaderController } from "./header.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { authenticateToken, isAdmin } from "../../middlewares/authMiddleware";
import { dynamicUpload, s3UploaderMiddleware } from "../../middlewares/s3FileUploadMiddleware";

const {
  createHeader,
  getAllHeaders,
  getHeaderById,
  updateHeaderById,
  deleteHeaderById,
  getServicesByType,
} = HeaderController;

const router = express.Router();

router
  .get("/type/:serviceFor", getServicesByType)

  .get("/", asyncHandler(getAllHeaders))
  .post(
    "/",
    // authenticateToken,
    // isAdmin,
    dynamicUpload([{ name: "icon", maxCount: 1 }]), // upload icon
    s3UploaderMiddleware("header"),
    asyncHandler(createHeader)
  )
  .get("/:id",
    //  authenticateToken, isAdmin, 
     asyncHandler(getHeaderById))
  .put(
    "/:id",
    // authenticateToken,
    // isAdmin,
    dynamicUpload([{ name: "icon", maxCount: 1 }]), // update icon
    s3UploaderMiddleware("header"),
    asyncHandler(updateHeaderById)
  )
  .delete("/:id", 
    // authenticateToken, isAdmin,
     asyncHandler(deleteHeaderById));

export default router;
