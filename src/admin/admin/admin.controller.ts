import Admin from "../../modals/admin.model";
import { config } from "../../config/config";
import jwt, { SignOptions } from "jsonwebtoken";
import ApiResponse from "../../utils/ApiResponse";
import { Request, Response, NextFunction } from "express";
import { CommonService } from "../../services/common.services";

const secret = config.jwt.secret;
const adminService = new CommonService(Admin);
const expiresIn = config.jwt.expiresIn as SignOptions["expiresIn"];

/**
 * User Controller
 */
export class AdminController {
  /**
   * Create a new user
   */
  static async createAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, employeeCode, email, password, role, status } =
        req.body;
      const user = await AdminController.createUser({
        role,
        email,
        password,
        username,
        employeeCode,
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

  static async updateAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { id } = req.params;
      const { username, role, status, employeeCode } = req.body;
      const updatedUser = await Admin.findByIdAndUpdate(
        id,
        { username, role, status: status === "active", employeeCode },
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
      const pipeline = [
        {
          $lookup: {
            from: "roles",
            localField: "role",
            foreignField: "_id",
            as: "roleDetails",
          },
        },
        {
          $unwind: {
            path: "$roleDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            role: "$roleDetails.name",
          },
        },
        {
          $project: {
            password: 0,
            roleDetails: 0,
          },
        },
      ];

      const result = await adminService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (error) {
      next(error);
    }
  }

  static async loginAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const data = await AdminController.loginUser({ email, password });

      // Send response with the token
      res.status(200).json({
        success: true,
        message: "Login successful",
        token: data.token, // Send the token in response
        user: {
          _id: data?.user?.id,
          role: data?.user?.role,
          email: data?.user?.email,
          username: data?.user?.username,
          permissions: data?.user?.permissions,
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
  static async getCurrentAdmin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user.id; // Extracted from the decoded JWT token
      const user: any = await AdminController.getUserById(userId);

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return; // Returning to prevent further execution
      }

      res.status(200).json({
        success: true,
        message: "User details fetched successfully",
        user: {
          _id: user._id,
          email: user.email,
          role: user?.role?.name,
          username: user?.username,
          permissions: user?.role?.permissions,
        },
      });
    } catch (error) {
      next(error); // Pass errors to the error handling middleware
    }
  }
  /**
   * Get user details by user ID
   */
  static async getUserById(userId: string) {
    const user = await Admin.findById({ _id: userId, status: true }).populate({
      path: "role",
      select: "name permissions",
    });
    return user;
  }

  /**
   * Create a new user
   */
  static async createUser(userData: {
    role: string;
    email: string;
    status: boolean;
    username: string;
    password: string;
    employeeCode: string;
  }) {
    const { username, email, password, role, status } = userData;

    const existingUser = await Admin.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser)
      throw new Error("User with this email or username already exists");

    const user = new Admin({ username, email, password, role, status });
    return await user.save();
  }

  /**
   * Login a user
   */
  static async loginUser(loginData: { email: string; password: string }) {
    const { email, password } = loginData;

    const user: any = await Admin.findOne({ email }).populate({
      path: "role",
      select: "name permissions",
    });
    if (!user) throw new Error("User not found with this email");

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new Error("Password is incorrect");

    const token = jwt.sign(
      { _id: user._id, email: user.email, role: user?.role?.name },
      secret,
      { expiresIn }
    );

    return {
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user?.role?.name,
        username: user.username,
        permissions: user?.role?.permissions,
      },
    };
  }
}
