import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import questionModel from "../../modals/question.model";
import { NextFunction, Request, Response } from "express";
import { CommonService } from "../../services/common.services";

const QuestionService = new CommonService(questionModel);

export class QuestionController {
  static async createQuestion(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await QuestionService.create(req.body);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create questions"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getFlows(req: Request, res: Response, next: NextFunction) {
    try {
      const flows = await questionModel.distinct("flow");
      return res.status(200).json({
        data: flows,
        success: true,
        message: "All flows fetched successfully",
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  };

  static async getQuestionByFlowAndStep(req: Request, res: Response) {
    try {
      const { flow, step } = req.query;
      if (!flow || !step) {
        return res.status(400).json({
          success: false,
          message: "Flow and step are required",
        });
      }

      const question = await questionModel.findOne({
        flow: flow as string,
        step: Number(step),
      });

      if (!question) {
        return res.status(404).json({
          success: false,
          message: "Question not found for this flow and step",
        });
      }

      return res.status(200).json({
        success: true,
        data: question,
        message: "Question fetched successfully",
      });
    } catch (error: any) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  };

  static async getAllQuestions(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await QuestionService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getQuestionById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await QuestionService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Questions not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateQuestionById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await QuestionService.updateById(
        req.params.id,
        req.body
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update Questions"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteQuestionById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await QuestionService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete Questions"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
