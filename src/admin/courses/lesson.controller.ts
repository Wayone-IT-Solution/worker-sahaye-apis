import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { UserType } from "../../modals/user.model";
import { NextFunction, Request, Response } from "express";
import { Course, Lesson } from "../../modals/courses.model";
import { CommonService } from "../../services/common.services";

const lessonService = new CommonService(Lesson);

export class LessonController {
  static async createLesson(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await lessonService.create(req.body);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create Lesson"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllLesson(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await lessonService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getLessonById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await lessonService.getById(req.params.id);
      if (!result)
        return res.status(404).json(new ApiError(404, "Lesson not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateLessonById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await lessonService.updateById(req.params.id, req.body);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update Lesson"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteLessonById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await lessonService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete Lesson"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getLessonsByCourseId(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const result = await Lesson.find({ course: id });
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async markAsCompleted(req: any, res: Response, next: NextFunction) {
    try {
      const { id: userId, role } = req.user;
      const { courseId, lessonId } = req.body;

      if (role !== UserType.WORKER) {
        return res
          .status(403)
          .json(
            new ApiResponse(
              403,
              null,
              "Access denied. Courses are only accessible to users with the 'WORKER' role."
            )
          );
      }

      // TODO: check for enrolled courses here too in future
      if (
        !mongoose.Types.ObjectId.isValid(courseId) ||
        !mongoose.Types.ObjectId.isValid(lessonId)
      ) {
        return res
          .status(400)
          .json(new ApiResponse(400, null, "Invalid course or lesson ID."));
      }

      // const alreadyExists = await TimeEntry.findOne({
      //   user: userId,
      //   course: courseId,
      //   lesson: lessonId,
      //   markedByUser: true,
      // });

      // if (alreadyExists) {
      //   return res
      //     .status(409)
      //     .json(
      //       new ApiResponse(409, alreadyExists, "Already marked as completed.")
      //     );
      // }

      // const lesson = await Lesson.findById(lessonId);
      // if (!lesson) {
      //   return res
      //     .status(404)
      //     .json(new ApiResponse(404, null, "Lesson not found."));
      // }

      // const data = {
      //   user: userId,
      //   date: new Date(),
      //   lesson: lessonId,
      //   course: courseId,
      //   markedByUser: true,
      // };

      // const result = await TimeEntry.create(data);

      // // Recalculate course progress
      // // const course: any = await Course.findById(courseId);
      // // if (course) await course.calculateProgress();

      // return res
      //   .status(200)
      //   .json(new ApiResponse(200, result, "Lesson marked as completed."));
    } catch (err) {
      next(err);
    }
  }
}
