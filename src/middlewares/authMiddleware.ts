import jwt from "jsonwebtoken";
import { NextFunction } from "express";
import Admin from "../modals/admin.model";
import { config } from "../config/config";
import { User } from "../modals/user.model";

const secret = config.jwt.secret;

/**
 * Middleware to verify JWT token
 */
export const authenticateToken = (req: any, res: any, next: NextFunction) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res
      .status(401)
      .json({ message: "Authentication token is required" });
  }
  try {
    const decoded = jwt.verify(token, secret) as {
      _id: string;
      role: string;
      email: string;
    };
    (req as any).user = { ...decoded, id: decoded?._id };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Type safety for req.user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role: "admin" | "user" | "worker" | "employer" | "contractor";
  };
}

const getModelByRole = (role: string) => {
  switch (role) {
    case "admin":
      return Admin;
    default:
      return User;
  }
};

const capitalize = (text: string): string =>
  text && text.charAt(0).toUpperCase() + text.slice(1);

const checkRole =
  (requiredRole: "admin" | "user" | "worker" | "employer" | "contractor") =>
    async (req: AuthenticatedRequest, res: any, next: NextFunction) => {
      const { user } = req;

      if (!user) {
        return res.status(401).json({ message: "Unauthorized. User not found." });
      }
      if (user.role !== requiredRole) {
        return res.status(403).json({
          status: false,
          message: `Access denied. ${capitalize(
            user.role
          )}s cannot access this route.`,
          expectedRole: requiredRole,
          currentRole: user.role,
        });
      }

      const Model: any = getModelByRole(requiredRole);

      if (!Model) {
        return res.status(500).json({
          status: false,
          message: "Internal server error. Invalid user role mapping.",
        });
      }

      const existingUser = await Model.findOne({ _id: user.id });
      if (!existingUser) {
        return res.status(404).json({
          status: false,
          message: `${capitalize(requiredRole)} not found in the system.`,
        });
      }

      next();
    };

// Export role-specific middlewares
export const isUser: any = checkRole("user");
export const isAdmin: any = checkRole("admin");
export const isWorker: any = checkRole("worker");
export const isEmployer: any = checkRole("employer");
export const isContractor: any = checkRole("contractor");
