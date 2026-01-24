import { Request, Response, NextFunction } from "express";
import { CommonService } from './../../services/common.services';
import { Subscription } from "../../modals/subscription.model";

const subscriptionService = new CommonService(Subscription);

export class SubscriptionController {
  //   static async create(req: Request, res: Response, next: NextFunction) {
  //     try {
  //       const subscription = await subscriptionService.create(req.body);
  //       res.status(201).json({
  //         success: true,
  //         data: subscription,
  //       });
  //     } catch (error: any) {
  //       next(error);
  //     }
  //   }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const subscription = await subscriptionService.getById(id, true);

      res.status(200).json({
        success: true,
        data: subscription,
      });
    } catch (error: any) {
      next(error);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subscriptionService.getAll(req.query);

      // Populate user and bundle
      const dataObj = data as any;
      const populatedResult = await Subscription.find({ _id: { $in: dataObj.result.map((r: any) => r._id) } })
        .populate('user', 'fullName mobile email usertype status')
        .populate({
          path: 'bundle',
          populate: {
            path: 'badges'
          }
        })
        .limit(parseInt(req.query.limit as string) || 10)
        .skip((Math.max(parseInt(req.query.page as string) || 1, 1) - 1) * (parseInt(req.query.limit as string) || 10));

      res.status(200).json({
        success: true,
        result: populatedResult,
        pagination: dataObj.pagination,
      });
    } catch (error: any) {
      next(error);
    }
  }

  static async getUserSubscriptions(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: userId } = (req as any).user;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. User ID not found in request.",
        });
      }

      const data = await subscriptionService.getAll({
        ...req.query,
        user: userId,
      });

      // Populate user and bundle
      const dataObj = data as any;
      const populatedResult = await Subscription.find({ _id: { $in: dataObj.result.map((r: any) => r._id) } })
        .populate('user', 'fullName mobile email usertype status')
        .populate({
          path: 'bundle',
          populate: {
            path: 'badges'
          }
        })
        .limit(parseInt(req.query.limit as string) || 10)
        .skip((Math.max(parseInt(req.query.page as string) || 1, 1) - 1) * (parseInt(req.query.limit as string) || 10));

      res.status(200).json({
        success: true,
        result: populatedResult,
        pagination: dataObj.pagination,
      });
    } catch (error: any) {
      next(error);
    }
  }

  static async updateById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await subscriptionService.updateById(id, req.body);

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error: any) {
      next(error);
    }
  }

  static async deleteById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const deleted = await subscriptionService.deleteById(id);

      res.status(200).json({
        success: true,
        data: deleted,
      });
    } catch (error: any) {
      next(error);
    }
  }
}
