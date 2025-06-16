/**
 * @file ticket.routes.ts
 * @description Defines all API endpoints related to ticket and agent management.
 * - Routes are protected using JWT authentication via `authenticateToken` middleware.
 * - Supports CRUD operations for support agents and support tickets.
 * - Handles ticket assignment, ticket interactions, and status updates.
 *
 * @routes
 * POST   /tickets                       → Create a new ticket
 * GET    /tickets                       → Retrieve all tickets (with optional filters)
 * GET    /tickets/:id                  → Retrieve a single ticket by ID
 * GET    /tickets/:id/:status          → Update a ticket's status
 * DELETE /tickets/:id                  → Delete a specific ticket
 * POST   /tickets/interactions         → Add internal interaction/notes to a ticket
 * POST   /tickets/manually-assigned    → Manually assign a ticket to an agent
 *
 * POST   /agents                       → Create a new agent
 * GET    /agents/deactivate/:id        → Deactivate an agent (soft delete)
 * GET    /agents                       → Get list of all agents
 * GET    /agents/unique                → Get list of unique/distinct agents
 * GET    /agents/:id                   → Get a specific agent by ID
 * PUT    /agents                      → Update agent details
 * DELETE /agents/:id                   → Delete an agent permanently
 */

import express from "express";
import {
  getAgents,
  getTicket,
  getTickets,
  createAgent,
  deleteAgent,
  updateAgent,
  deleteTicket,
  getAgentByID,
  createTicket,
  addInteraction,
  getUniqueAgents,
  deactivateAgent,
  updateTicketStatus,
  manualAssignTicketToAgent,
} from "./support.controller";
import {
  isUser,
  isAdmin,
  authenticateToken,
} from "../../middlewares/authMiddleware";
import { asyncHandler } from "../../utils/asyncHandler";

const router = express.Router();

// AGENT ROUTES
router.post("/agents", authenticateToken, isAdmin, asyncHandler(createAgent));
router.get(
  "/agents/deactivate/:id",
  authenticateToken,
  isAdmin,
  asyncHandler(deactivateAgent)
);
router.get("/agents", authenticateToken, isAdmin, asyncHandler(getAgents));
router.get(
  "/agents/unique",
  authenticateToken,
  isAdmin,
  asyncHandler(getUniqueAgents)
);
router.get(
  "/agents/:id",
  authenticateToken,
  isAdmin,
  asyncHandler(getAgentByID)
);
router.put("/agents", authenticateToken, isAdmin, asyncHandler(updateAgent));
router.delete(
  "/agents/:id",
  authenticateToken,
  isAdmin,
  asyncHandler(deleteAgent)
);

// TICKET ROUTES
router.post("/tickets", authenticateToken, isUser, asyncHandler(createTicket));
router.get("/tickets", authenticateToken, asyncHandler(getTickets));
router.get("/tickets/:id", authenticateToken, asyncHandler(getTicket));
router.get(
  "/tickets/:id/:status",
  authenticateToken,
  asyncHandler(updateTicketStatus)
);
router.delete("/tickets/:id", authenticateToken, asyncHandler(deleteTicket));
router.post(
  "/tickets/interactions",
  authenticateToken,
  asyncHandler(addInteraction)
);
router.post(
  "/tickets/manually-assigned",
  authenticateToken,
  asyncHandler(manualAssignTicketToAgent)
);

export default router;
