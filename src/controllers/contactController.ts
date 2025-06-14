import { Request, Response, NextFunction } from "express";
import Contact, { IContact } from "../modals/contactModal";
import { getPipeline, paginationResult } from "../utils/helper";

export class ContactController {
  /**
   * 📨 Submit a new contact message (Public)
   */
  static async submitMessage(
    req: Request<{}, {}, Pick<IContact, "email" | "username" | "message">>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { email, username, message } = req.body;
      const contact = await Contact.create({ email, username, message });

      res.status(201).json({
        success: true,
        message: "Message submitted successfully",
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 🔍 Get all contact messages (Admin only)
   */
  static async getAllContacts(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { page = 1, limit = 10 }: any = req.query;
      const { pipeline, matchStage, options } = getPipeline(req.query);

      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);

      pipeline.push({
        $project: {
          _id: 1,
          email: 1,
          username: 1,
          createdAt: 1,
          resolvedAt: 1,
          isResolved: 1,
        },
      });
      const contact = await Contact.aggregate(pipeline, options);
      const totalcontact = await Contact.countDocuments(
        Object.keys(matchStage).length > 0 ? matchStage : {},
      );

      if (!contact || contact.length === 0) {
        res.status(404).json({ success: false, message: "contacts not found" });
        return;
      }

      const response = paginationResult(
        pageNumber,
        limitNumber,
        totalcontact,
        contact,
      );
      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 📄 Get a single contact message by ID (Admin only)
   */
  static async getContactById(
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const contact = await Contact.findById(req.params.id);
      if (!contact) {
        res.status(404).json({ success: false, message: "Contact not found" });
        return;
      }

      res.status(200).json({ success: true, data: contact });
    } catch (error) {
      next(error);
    }
  }

  /**
   * ✉️ Reply to a contact message (Admin only)
   * Automatically sets `resolvedBy` and adds internal note
   */
  static async replyToContact(
    req: Request<{ id: string }, {}, { internalNote: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { internalNote } = req.body;
      const contact: any = await Contact.findById(req.params.id);

      if (!contact) {
        res.status(404).json({ success: false, message: "Contact not found" });
        return;
      }

      contact.internalNote = internalNote;
      await contact.save();

      res.status(200).json({
        success: true,
        data: contact,
        message: "Replied and marked as resolved",
      });
    } catch (error) {
      next(error);
    }
  }
}
