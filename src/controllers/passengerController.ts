import jwt from "jsonwebtoken";
import Otp from "../modals/OtpModel";
import ApiResponse from "../utils/ApiResponse";
import Passenger from "../modals/passengerModal";
import { Request, Response, NextFunction } from "express";
import { getPipeline, paginationResult } from "../utils/helper";

const JWT_SECRET = process.env.JWT_SECRET || "your_fallback_jwt_secret";

export class PassengerController {
  static async createUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { name, email, phoneNumber } = req.body;
      // Check if the user already exists by phone number
      const existingUser = await Passenger.findOne({ phoneNumber });
      if (existingUser) {
        res.status(400).json({
          success: false,
          message: "User already exists with this phone number",
        });
        return;
      }

      // Create new user
      const newUser = new Passenger({
        name,
        email,
        phoneNumber,
      });

      await newUser.save();

      res.status(201).json({
        success: true,
        message: "User created successfully",
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phoneNumber: newUser.phoneNumber,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(
    req: Request | any,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { _id } = req.user;
      const { name, email, fcmToken } = req.body;

      // Find user by ID
      const user = await Passenger.findById(_id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      // Update user fields
      if (name) user.name = name;
      if (email) user.email = email;
      if (fcmToken) user.fcmToken = fcmToken;

      await user.save();

      res.status(200).json({
        success: true,
        message: "User updated successfully",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async generateOtp(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { phoneNumber } = req.body;

      // Check if the phone number exists in the system
      const user = await Passenger.findOne({ phoneNumber });
      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      // Generate OTP (you can use any library or method to generate the OTP)
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

      // Save the OTP to the database
      const otp = new Otp({
        expiresAt,
        phoneNumber,
        otp: otpCode,
        verified: false,
      });

      await otp.save();

      // Send OTP to the user (implement your SMS sending logic here)
      console.log(`OTP for ${phoneNumber}: ${otpCode}`); // In real case, send the OTP via SMS

      res.status(200).json({
        success: true,
        otp: otpCode,
        message: "OTP sent successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllPassengers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { page = 1, limit = 10 }: any = req.query;
      const { pipeline, matchStage, options } = getPipeline(req.query);

      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);

      const response = await Passenger.aggregate(pipeline, options);
      const totalPassengers = await Passenger.countDocuments(
        Object.keys(matchStage).length > 0 ? matchStage : {}
      );

      const data = paginationResult(
        pageNumber,
        limitNumber,
        totalPassengers,
        response
      );
      return res
        .status(200)
        .json(new ApiResponse(200, data, "Tickets fetched successfully"));
    } catch (error) {
      next(error);
    }
  }

  static async verifyOtp(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { phoneNumber, otp } = req.body;

      // Find the OTP document for the phone number
      const otpDoc = await Otp.findOne({ phoneNumber, otp });
      if (!otpDoc || otpDoc.expiresAt < new Date()) {
        res.status(400).json({
          success: false,
          message: "Invalid OTP or OTP has expired",
        });
        return;
      }

      // Mark OTP as verified
      otpDoc.verified = true;
      await otpDoc.save();

      // Find the user associated with the phone number
      const user = await Passenger.findOne({ phoneNumber, status: "active" });
      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        { _id: user._id, phoneNumber: user.phoneNumber, role: "passenger" },
        JWT_SECRET,
        { expiresIn: "7d" } // Token expiration
      );

      res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          role: user.role,
          email: user.email,
          phoneNumber: user.phoneNumber,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCurrentUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user.id; // Extracted from the decoded JWT token

      // Fetch user details by userId
      const user = await Passenger.findById({ _id: userId, status: "active" });
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "User details fetched successfully",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleUserStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const user = await Passenger.findById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      user.status = status;
      await user.save();

      res.status(200).json({
        success: true,
        message: `User status updated to ${status}`,
        user: {
          id: user._id,
          name: user.name,
          phoneNumber: user.phoneNumber,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
