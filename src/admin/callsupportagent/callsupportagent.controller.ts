import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { extractImageUrl } from "../community/community.controller";
import { CallSupportAgent } from "../../modals/callsupportagent.model";

const CallSupportAgentService = new CommonService(CallSupportAgent);

export class CallSupportAgentController {
  static async createCallSupportAgent(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const duplicate = await CallSupportAgent.findOne({
        $or: [
          { email: req.body.email },
          { phoneNumber: req.body.phoneNumber },
          { name: req.body.name },
        ],
      });
      const profileImageUrl = req?.body?.profileImageUrl?.[0]?.url;

      if (duplicate) {
        return res
          .status(409)
          .json(
            new ApiError(
              409,
              "Support Agent with same name, email, or phoneNumber already exists."
            )
          );
      }
      const location = {
        city: req.body.city,
        state: req.body.state,
        pinCode: req.body.pinCode,
        country: req.body.country,
      };
      const result = await CallSupportAgentService.create({
        ...req.body,
        location,
        profileImageUrl,
      });
      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create Support Agent profile"));
      }

      return res
        .status(201)
        .json(
          new ApiResponse(201, result, "Support Agent created successfully")
        );
    } catch (err) {
      next(err);
    }
  }

  static async getAllCallSupportAgents(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await CallSupportAgentService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getCallSupportAgentById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await CallSupportAgentService.getById(
        req.params.id,
        false
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Support Agent not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateCallSupportAgentById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;
      const location = {
        city: req.body.city,
        state: req.body.state,
        pinCode: req.body.pinCode,
        country: req.body.country,
      };
      const profileImageUrl = req?.body?.profileImageUrl[0]?.url;
      const record = await CallSupportAgentService.getById(id);
      if (!record) {
        return res.status(404).json(new ApiError(404, "Assistant not found."));
      }

      let imageUrl;
      if (req?.body?.image && record.profileImageUrl)
        imageUrl = await extractImageUrl(
          req?.body?.image,
          record.profileImageUrl as string
        );

      const result = await CallSupportAgentService.updateById(id, {
        ...req.body,
        location,
        profileImageUrl: imageUrl || profileImageUrl,
      });
      if (!result) {
        return res
          .status(400)
          .json(new ApiError(400, "Failed to update Support Agent profile."));
      }
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "Support Agent profile updated successfully."
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async deleteCallSupportAgentById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;
      const record = await CallSupportAgentService.getById(id);
      if (!record) {
        return res
          .status(404)
          .json(new ApiError(404, "Support Agent profile not found."));
      }
      const result = await CallSupportAgentService.deleteById(id);
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "Support Agent profile deleted successfully."
          )
        );
    } catch (err) {
      next(err);
    }
  }
}
