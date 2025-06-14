import jwt from "jsonwebtoken";
import Otp from "../modals/OtpModel";
import Driver from "../modals/driverModal";
import ApiResponse from "../utils/ApiResponse";
import { Request, Response, NextFunction } from "express";
import { getPipeline, paginationResult } from "../utils/helper";

const JWT_SECRET = process.env.JWT_SECRET || "your_fallback_jwt_secret";
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class DriverController {
  static async createUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { name, email, phoneNumber } = req.body;

      // 1. Prevent duplicates
      if (await Driver.findOne({ phoneNumber })) {
        res
          .status(400)
          .json({ success: false, message: "Phone already registered" });
        return;
      }
      if (await Driver.findOne({ email })) {
        res
          .status(400)
          .json({ success: false, message: "Email already in use" });
        return;
      }

      // 3. Create driver (defaults handle kyc, approvalStatus, status, etc.)
      const driver = new Driver({
        name,
        email,
        phoneNumber,
      });
      await driver.save();

      res.status(201).json({
        data: driver,
        success: true,
        message: "Driver registered. Please verify your mobile number via OTP.",
      });
    } catch (err) {
      next(err);
    }
  }

  static async getDriverById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      let driver: any = await Driver.findById(id);

      if (!driver) {
        res.status(404).json({
          success: false,
          message: "Driver not found",
        });
        return;
      }

      driver = driver.toObject();

      const vehicle = driver.vehicle;
      const documents = driver.documents;
      const latitude = driver.location.coordinates[1];
      const longitude = driver.location.coordinates[0];

      delete driver.location; // remove location from response
      delete driver.vehicle; // remove vehicle from response
      delete driver.documents; // remove documents from response

      res.status(200).json({
        success: true,
        data: { latitude, longitude, ...driver, ...vehicle, ...documents },
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteDriverById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const driver = await Driver.findByIdAndDelete(id);
      if (!driver) {
        res.status(404).json({ success: false, message: "Driver not found" });
        return;
      }

      res
        .status(200)
        .json({ success: true, message: "Driver deleted successfully" });
    } catch (err) {
      next(err);
    }
  }

  static async createRider(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { id } = req.query;
      const {
        name,
        email,
        type,
        number,
        model,
        color,
        status,
        latitude,
        longitude,
        documents,
        kycVerified,
        phoneNumber,
        description,
        approvalStatus,
        commissionPercentage,
      } = req.body;

      const updates: any = {
        ...(name && { name }),
        ...(email && { email }),
        ...(status && { status }),
        ...(description && { description }),
        ...(kycVerified && { kycVerified }),
        ...(phoneNumber && { phoneNumber }),
        ...(approvalStatus && { approvalStatus }),
        ...(commissionPercentage && { commissionPercentage }),
        ...(latitude &&
          longitude && {
            location: {
              type: "Point",
              coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
          }),
      };

      // Handle vehicle
      const vehicle = {
        ...(type && { type }),
        ...(model && { model }),
        ...(color && { color }),
        ...(number && { number }),
      };
      if (Object.keys(vehicle).length) updates.vehicle = vehicle;

      // Handle uploaded files
      const files = req.files as Record<string, Express.Multer.File[]>;
      if (files) {
        if (files.avatarUrl?.[0]) updates.avatarUrl = files.avatarUrl[0].path;

        const docFiles: any = {
          ...(files.license?.[0] && { license: files.license[0].path }),
          ...(files.adhaarCard?.[0] && {
            adhaarCard: files.adhaarCard[0].path,
          }),
        };

        if (Object.keys(docFiles).length) {
          updates.documents = { ...documents, ...docFiles };
        } else if (documents) {
          updates.documents = documents;
        }
      }

      if (!id) {
        // Check duplicates
        const existing = await Driver.findOne({
          $or: [{ phoneNumber }, { email }],
        });

        if (existing) {
          return res.status(400).json({
            success: false,
            message:
              existing.phoneNumber === phoneNumber
                ? "Phone already registered"
                : "Email already in use",
          });
        }

        await Driver.create(updates);
        return res.status(201).json({
          success: true,
          message: "Driver registered successfully",
        });
      }

      // Update existing driver
      const driver = await Driver.findById(id);
      if (!driver) {
        return res
          .status(404)
          .json({ success: false, message: "Driver not found" });
      }

      Object.assign(driver, updates);
      await driver.save();

      return res.json({
        driver,
        success: true,
        message: "Driver updated successfully",
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateDriver(
    req: Request | any,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { id } = req.user;
      const {
        name,
        type,
        model,
        color,
        number,
        latitude,
        longitude,
        avatarUrl,
        documents,
        description,
      } = req.body;

      const updates: any = {
        ...(name && { name }),
        ...(avatarUrl && { avatarUrl }),
        ...(description && { description }),
        ...(latitude &&
          longitude && {
            location: {
              type: "Point",
              coordinates: [parseFloat(longitude), parseFloat(latitude)],
            },
          }),
      };

      // Handle vehicle
      const vehicle = {
        ...(type && { type }),
        ...(model && { model }),
        ...(color && { color }),
        ...(number && { number }),
      };
      if (Object.keys(vehicle).length) updates.vehicle = vehicle;

      const files = req.files as Record<string, Express.Multer.File[]>;
      if (files) {
        if (files.avatarUrl?.[0]) updates.avatarUrl = files.avatarUrl[0].path;

        const docFiles: any = {
          ...(files.license?.[0] && { license: files.license[0].path }),
          ...(files.adhaarCard?.[0] && {
            adhaarCard: files.adhaarCard[0].path,
          }),
        };

        if (Object.keys(docFiles).length) {
          updates.documents = { ...documents, ...docFiles };
        } else if (documents) {
          updates.documents = documents;
        }
      }

      const driver = await Driver.findByIdAndUpdate(id, updates, { new: true });

      if (!driver) {
        return res
          .status(404)
          .json({ success: false, message: "Driver not found" });
      }

      return res.json({
        driver,
        success: true,
        message: "Driver updated successfully",
      });
    } catch (err) {
      next(err);
    }
  }

  static async generateOtp(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { phoneNumber } = req.body;
      const driver = await Driver.findOne({ phoneNumber });
      if (!driver) {
        res.status(404).json({ success: false, message: "Driver not found" });
        return;
      }

      // create OTP record
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + OTP_TTL_MS);

      await Otp.create({ phoneNumber, otp: code, expiresAt, verified: false });

      // TODO: actually send via SMS/WhatsApp
      console.log(`→ OTP for ${phoneNumber}: ${code}`);

      res.json({ success: true, otp: code, message: "OTP sent" });
    } catch (err) {
      next(err);
    }
  }

  static async getAllDrivers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<any> {
    try {
      const { page = 1, limit = 10 }: any = req.query;
      const { pipeline, matchStage, options } = getPipeline(req.query);

      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);

      pipeline.push({
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          status: 1,
          avatarUrl: 1,
          createdAt: 1,
          kycVerified: 1,
          phoneNumber: 1,
          approvalStatus: 1,
          ridesCompleted: 1,
          isMobileVerified: 1,
        },
      });

      const response = await Driver.aggregate(pipeline, options);
      const totalDrivers = await Driver.countDocuments(
        Object.keys(matchStage).length > 0 ? matchStage : {}
      );

      const data = paginationResult(
        pageNumber,
        limitNumber,
        totalDrivers,
        response
      );
      return res
        .status(200)
        .json(new ApiResponse(200, data, "Drivers fetched successfully"));
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

      const record = await Otp.findOne({ phoneNumber, otp });
      if (!record || record.expiresAt < new Date()) {
        res
          .status(400)
          .json({ success: false, message: "Invalid or expired OTP" });
        return;
      }

      // mark OTP used
      record.verified = true;
      await record.save();

      // mark driver mobile as verified
      const driver = await Driver.findOneAndUpdate(
        { phoneNumber },
        { isMobileVerified: true },
        { new: true }
      );
      if (!driver) {
        res.status(404).json({ success: false, message: "Driver not found" });
        return;
      }

      // issue JWT
      const token = jwt.sign(
        { _id: driver._id, phoneNumber: driver.phoneNumber, role: "driver" },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        token,
        success: true,
        data: driver,
        message: "Mobile verified — login successful",
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCurrentUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const driverId = (req as any).user.id;
      const driver = await Driver.findById({ _id: driverId, status: "active" });
      if (!driver) {
        res.status(404).json({ success: false, message: "Driver not found" });
        return;
      }
      res.status(200).json({ success: true, data: driver });
    } catch (err) {
      next(err);
    }
  }
}
