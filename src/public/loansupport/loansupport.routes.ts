import express, { Router } from "express";
import { LoanSupportController } from "./loansupport.controller";

const router: Router = express.Router();

// Public routes
router.post("/", LoanSupportController.createLoanRequest);
router.get("/", LoanSupportController.getAllLoanRequests);
router.get("/stats", LoanSupportController.getLoanStatistics);
router.get("/:id", LoanSupportController.getLoanRequestById);

// Update
router.put("/:id", LoanSupportController.updateLoanRequest);

// Admin routes (approve/reject)
router.post("/:id/approve", LoanSupportController.approveLoanRequest);
router.post("/:id/reject", LoanSupportController.rejectLoanRequest);

// Delete
router.delete("/:id", LoanSupportController.deleteLoanRequest);

export default router;
