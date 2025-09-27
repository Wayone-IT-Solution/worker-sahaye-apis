// Conversation Controller
import { Request, Response } from 'express';

export const createConversation = (req: Request, res: Response) => {
  res.send('Create conversation');
};

export const getAllConversations = (req: Request, res: Response) => {
  res.send('Get all conversations');
};

export const getConversationById = (req: Request, res: Response) => {
  res.send('Get conversation by ID');
};

export const updateConversationById = (req: Request, res: Response) => {
  res.send('Update conversation by ID');
};

export const deleteConversationById = (req: Request, res: Response) => {
  res.send('Delete conversation by ID');
};
