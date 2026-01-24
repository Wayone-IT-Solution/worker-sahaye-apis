import { Router } from "express";
import { SubscriptionController } from "./subscription.controller";
import { authenticateToken } from "../../middlewares/authMiddleware";

const router = Router();

// router.post("/", SubscriptionController.create);
router.get("/", SubscriptionController.getAll);
router.get("/user/me", authenticateToken, SubscriptionController.getUserSubscriptions);
router.get("/:id", SubscriptionController.getById);
router.patch("/:id", SubscriptionController.updateById);
router.delete("/:id", SubscriptionController.deleteById);

export default router;
