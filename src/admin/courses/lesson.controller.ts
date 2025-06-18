import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { UserType } from "../../modals/user.model";
import { NextFunction, Request, Response } from "express";
import { Enrollment } from "../../modals/enrollment.model";
import { CommonService } from "../../services/common.services";
import { Lesson, TimeEntry, TimeEntryStatus } from "../../modals/courses.model";

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
        return res.status(403).json(
          new ApiError(
            403,
            "Access denied. Courses are only accessible to users with the 'WORKER' role."
          )
        );
      }

      if (
        !mongoose.Types.ObjectId.isValid(courseId) ||
        !mongoose.Types.ObjectId.isValid(lessonId)
      ) {
        return res
          .status(400)
          .json(new ApiResponse(400, null, "Invalid course or lesson ID."));
      }

      const lesson = await Lesson.findById(lessonId);
      if (!lesson)
        return res
          .status(404)
          .json(new ApiResponse(404, null, "Lesson not found."));


      // Check if the user is enrolled in the course
      const enrollment = await Enrollment.findOne({ user: userId, course: courseId });
      if (!enrollment)
        return res
          .status(404)
          .json(new ApiResponse(404, null, "Enrollment not found for this user and course."));


      // Check if already completed
      const existingEntry = await TimeEntry.findOne({
        user: userId,
        course: courseId,
        lesson: lessonId,
        status: TimeEntryStatus.COMPLETED,
      });

      if (existingEntry) {
        return res
          .status(409)
          .json(new ApiResponse(409, existingEntry, "Lesson already marked as completed."));
      }

      // Fetch or create the entry
      let entry = await TimeEntry.findOne({
        user: userId,
        course: courseId,
        lesson: lessonId,
      });

      const now = new Date();
      if (!entry) {
        entry = new TimeEntry({
          user: userId,
          timeSpent: 0,
          startedAt: now,
          course: courseId,
          lesson: lessonId,
          completedAt: now,
          status: TimeEntryStatus.COMPLETED,
        });
      } else {
        entry.status = TimeEntryStatus.COMPLETED;
        entry.completedAt = now;
        if (entry.startedAt) {
          const diffMs = now.getTime() - new Date(entry.startedAt).getTime();
          entry.timeSpent = Math.floor(diffMs / 1000 / 60);
        } else {
          entry.startedAt = now;
          entry.timeSpent = 0;
        }
      }

      await entry.save();

      // Update Enrollment progress
      const totalLessons = await Lesson.countDocuments({ course: courseId });
      const completedLessons = await TimeEntry.countDocuments({
        user: userId,
        course: courseId,
        status: TimeEntryStatus.COMPLETED,
      });

      let progress = 0;
      if (totalLessons > 0) {
        progress = Math.round((completedLessons / totalLessons) * 100);
      }

      enrollment.progress = progress;
      await enrollment.save();

      return res
        .status(200)
        .json(new ApiResponse(200, entry, "Lesson marked as completed."));
    } catch (err) {
      next(err);
    }
  }

  static async markAsStarted(req: any, res: Response, next: NextFunction) {
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

      if (
        !mongoose.Types.ObjectId.isValid(courseId) ||
        !mongoose.Types.ObjectId.isValid(lessonId)
      ) {
        return res
          .status(400)
          .json(new ApiResponse(400, null, "Invalid course or lesson ID."));
      }

      const lesson = await Lesson.findById(lessonId);
      if (!lesson) {
        return res
          .status(404)
          .json(new ApiResponse(404, null, "Lesson not found."));
      }

      const entry = await TimeEntry.findOneAndUpdate(
        { user: userId, course: courseId, lesson: lessonId },
        {
          startedAt: new Date(),
          status: TimeEntryStatus.IN_PROGRESS,
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      return res
        .status(200)
        .json(new ApiResponse(200, entry, "Lesson marked as started."));
    } catch (err) {
      next(err);
    }
  }
}
