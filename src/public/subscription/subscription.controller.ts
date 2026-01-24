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

      res.status(200).json({
        success: true,
        ...data,
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

      res.status(200).json({
        success: true,
        ...data,
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
