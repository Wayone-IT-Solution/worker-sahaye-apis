import Admin from "../modals/userModal";
import ApiError from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import { UserService } from "../services/userServices";
import { Request, Response, NextFunction } from "express";
import { getPipeline, paginationResult } from "../utils/helper";

/**
 * User Controller
 */
export class UserController {
  /**
   * Create a new user
   */
  static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, email, password, role, status } = req.body;
      const user = await UserService.createUser({
        username,
        email,
        password,
        role,
        status: status === "active",
      });
      res
        .status(201)
        .json({ success: true, message: "User created successfully", user });
    } catch (error) {
      next(error);
    }
  }

  static async getAdminById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { id } = req.params;
      let admin = await Admin.findById(id);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin not found",
        });
      }
      admin = JSON.parse(JSON.stringify(admin));

      res.status(200).json({
        success: true,
        data: { ...admin, password: "" },
        message: "Admin retrieved successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { id } = req.params;
      const { username, role, status } = req.body;
      const updatedUser = await Admin.findByIdAndUpdate(
        id,
        { username, role, status: status === "active" },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      res.status(200).json({
        success: true,
        message: "User updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllAdmins(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { page = 1, limit = 10 }: any = req.query;
      const { pipeline, matchStage, options } = getPipeline(req.query);

      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);

      const response = await Admin.aggregate(pipeline, options);
      const totalAdmins = await Admin.countDocuments(
        Object.keys(matchStage).length > 0 ? matchStage : {}
      );

      if (!response.length)
        return res.status(404).json(new ApiError(404, "No Reviews found"));

      const data = paginationResult(
        pageNumber,
        limitNumber,
        totalAdmins,
        response
      );
      return res
        .status(200)
        .json(new ApiResponse(200, data, "Tickets fetched successfully"));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login a user
   */
  static async loginUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const data = await UserService.loginUser({ email, password });

      // Send response with the token
      res.status(200).json({
        success: true,
        message: "Login successful",
        token: data.token, // Send the token in response
        user: {
          _id: data.user.id,
          role: data?.user.role,
          email: data.user.email,
          username: data.user.username,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get the current user details based on the provided JWT token
   * @param {Request} req - The request object
   * @param {Response} res - The response object
   * @param {NextFunction} next - The next middleware function
   */
  static async getCurrentUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user.id; // Extracted from the decoded JWT token
      const user = await UserService.getUserById(userId);

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return; // Returning to prevent further execution
      }

      res.status(200).json({
        success: true,
        message: "User details fetched successfully",
        user: {
          _id: user._id,
          role: user.role,
          email: user.email,
          username: user.username,
        },
      });
    } catch (error) {
      next(error); // Pass errors to the error handling middleware
    }
  }
}
