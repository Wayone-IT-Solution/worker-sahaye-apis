// Conversation Routes
import express from "express";
import {
  createConversation,
  getAllConversations,
  getConversationById,
  updateConversationById,
  deleteConversationById,
} from "./conversation.controller";

const router = express.Router();

router
  .post("/", createConversation)
  .get("/", getAllConversations)
  .get("/:id", getConversationById)
  .put("/:id", updateConversationById)
  .delete("/:id", deleteConversationById);

export default router;
