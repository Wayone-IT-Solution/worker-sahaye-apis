import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";
import { extractImageUrl } from "../community/community.controller";
import { PersonalAssistant } from "../../modals/personalassistant.model";

const PersonalAssistantService = new CommonService(PersonalAssistant);

export class PersonalAssistantController {
  static async createPersonalAssistant(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const duplicate = await PersonalAssistant.findOne({
        $or: [
          { email: req.body.email },
          { phoneNumber: req.body.phoneNumber },
          { name: req.body.name },
        ],
      });
      const profileImageUrl = req?.body?.profileImageUrl[0]?.url;
      if (!profileImageUrl)
        return res
          .status(403)
          .json(new ApiError(403, "Profile Image is Required."));
      if (duplicate) {
        return res
          .status(409)
          .json(
            new ApiError(
              409,
              "Personal Assistant with same name, email, or phoneNumber already exists."
            )
          );
      }
      const location = {
        city: req.body.city,
        state: req.body.state,
        pinCode: req.body.pinCode,
        country: req.body.country,
      };
      const result = await PersonalAssistantService.create({
        ...req.body,
        location,
        profileImageUrl,
      });
      if (!result) {
        return res
          .status(400)
          .json(
            new ApiError(400, "Failed to create Personal Assistant profile")
          );
      }

      return res
        .status(201)
        .json(
          new ApiResponse(
            201,
            result,
            "Personal Assistant created successfully"
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async getAllPersonalAssistants(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await PersonalAssistantService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getPersonalAssistantById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await PersonalAssistantService.getById(
        req.params.id,
        false
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Personal Assistant not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updatePersonalAssistantById(
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
      const record = await PersonalAssistantService.getById(id);
      if (!record) {
        return res.status(404).json(new ApiError(404, "Assistant not found."));
      }

      let imageUrl;
      if (req?.body?.image && record.profileImageUrl)
        imageUrl = await extractImageUrl(
          req?.body?.image,
          record.profileImageUrl as string
        );

      const result = await PersonalAssistantService.updateById(id, {
        ...req.body,
        location,
        profileImageUrl: imageUrl || profileImageUrl,
      });
      if (!result) {
        return res
          .status(400)
          .json(
            new ApiError(400, "Failed to update Personal Assistant profile.")
          );
      }
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "Personal Assistant profile updated successfully."
          )
        );
    } catch (err) {
      next(err);
    }
  }

  static async deletePersonalAssistantById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const id = req.params.id;
      const record = await PersonalAssistantService.getById(id);
      if (!record) {
        return res
          .status(404)
          .json(new ApiError(404, "Personal Assistant profile not found."));
      }
      const result = await PersonalAssistantService.deleteById(id);
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            result,
            "Personal Assistant profile deleted successfully."
          )
        );
    } catch (err) {
      next(err);
    }
  }
}
