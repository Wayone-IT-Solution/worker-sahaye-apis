import express from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { PreInterviewedContractorController } from "./preinterviewedcontractor.controller";
import { authenticateToken, isAdmin, isContractor, isEmployer } from "../../middlewares/authMiddleware";

const {
  createPreInterviewedContractor,
  getAllPreInterviewedContractors,
  getPreInterviewedContractorById,
  updatePreInterviewedContractorById,
  deletePreInterviewedContractorById,
  getPreInterviewedContractorDetails,
  getAllPreInterviewedContractorsForUser
} = PreInterviewedContractorController;

const router = express.Router();

router
  .get("/", authenticateToken, isAdmin, asyncHandler(getAllPreInterviewedContractors))
  .get("/contractors", authenticateToken, (req, res, next) => {
    const userRole = (req as any).user?.role;
    if (userRole == "employer" || userRole == "Employer" || userRole === "admin") {
      next();
    } else {
      res.status(403).json({ status: false, message: `Access denied. '${userRole}' role cannot access this route.`, expectedRole: "employer or admin", yourRole: userRole });
    }
  }, asyncHandler(getAllPreInterviewedContractorsForUser))
  .get("/contractors/:engagementType", authenticateToken, (req, res, next) => {
    const userRole = (req as any).user?.role;
    if (userRole == "employer" || userRole == "Employer" || userRole === "admin") {
      next();
    } else {
      res.status(403).json({ status: false, message: `Access denied. '${userRole}' role cannot access this route.`, expectedRole: "employer or admin", yourRole: userRole });
    }
  }, asyncHandler(getAllPreInterviewedContractorsForUser))
  .get("/:id", authenticateToken, isAdmin, asyncHandler(getPreInterviewedContractorById))
  .put("/:id",
    authenticateToken,
    isAdmin,
    asyncHandler(updatePreInterviewedContractorById))
  .delete("/:id", authenticateToken, isAdmin, asyncHandler(deletePreInterviewedContractorById))
  .post("/",
    authenticateToken,
    isContractor,
    asyncHandler(createPreInterviewedContractor))
  .patch("/",
    authenticateToken,
    isContractor,
    asyncHandler(getPreInterviewedContractorDetails));

export default router;
