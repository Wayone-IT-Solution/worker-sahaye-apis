import jwt from "jsonwebtoken";
import Admin from "../modals/admin.model";
import { config } from "../config/config";
import Agent from "../modals/agent.model";
import { User } from "../modals/user.model";
import { Request, Response, NextFunction } from "express";

// Role type
export type Role = "admin" | "worker" | "agent" | "employer" | "contractor";

// Extend Express Request with typed user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: Role;
    email?: string;
  };
}

const secret = config.jwt.secret;

/**
 * Middleware to authenticate JWT token and attach user to request
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
): any => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      status: false,
      message: "Access denied. No authentication token provided.",
    });
  }

  try {
    const decoded = jwt.verify(token, secret) as {
      _id: string;
      role: Role;
      email: string;
    };

    (req as AuthenticatedRequest).user = {
      id: decoded._id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: "Invalid or expired authentication token.",
    });
  }
};

/**
 * Allow all roles except the ones listed
 */
export const allowAllExcept =
  (...rolesToBlock: Role[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { user } = req;

    if (!user) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized access. User not found.",
      });
    }

    if (rolesToBlock.includes(user.role)) {
      return res.status(403).json({
        status: false,
        message: `Access restricted. '${capitalize(
          user.role
        )}' role is not permitted on this route.`,
      });
    }

    next();
  };

/**
 * Allow only the listed roles
 */
export const allowOnly =
  (...allowedRoles: Role[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { user } = req;

    if (!user) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized access. User not found.",
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        status: false,
        message: `Access denied. Only [${allowedRoles
          .map(capitalize)
          .join(", ")}] roles are allowed.`,
        yourRole: user.role,
      });
    }

    next();
  };

/**
 * Middleware to check if the user has a specific role and exists in the DB
 */
export const checkRole: any =
  (requiredRole: Role) =>
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { user } = req;

    if (!user) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized access. User not found.",
      });
    }

    if (user.role !== requiredRole) {
      return res.status(403).json({
        status: false,
        message: `Access denied. '${capitalize(
          user.role
        )}' role cannot access this route.`,
        expectedRole: requiredRole,
        yourRole: user.role,
      });
    }

    const Model: any = getModelByRole(user.role);

    if (!Model) {
      return res.status(500).json({
        status: false,
        message: "Internal error. Unable to resolve user role model.",
      });
    }

    const existingUser = await Model.findById(user.id);
    if (!existingUser) {
      return res.status(404).json({
        status: false,
        message: `${capitalize(requiredRole)} account not found in the system.`,
      });
    }

    next();
  };

// Utility: Map role to respective model
const getModelByRole = (role: Role) => {
  switch (role) {
    case "admin":
      return Admin;
    case "agent":
      return Agent;
    case "employer":
    case "worker":
    case "contractor":
      return User;
    default:
      return null;
  }
};

// Utility: Capitalize the first letter
const capitalize = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

// Export reusable role-based middlewares
export const isAdmin = checkRole("admin");
export const isAgent = checkRole("agent");
export const isWorker = checkRole("worker");
export const isEmployer = checkRole("employer");
export const isContractor = checkRole("contractor");
