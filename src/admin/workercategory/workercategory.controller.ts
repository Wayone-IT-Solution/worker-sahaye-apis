// Workercategory Controller
import { Request, Response } from 'express';

export const createWorkercategory = (req: Request, res: Response) => {
  res.send('Create workercategory');
};

export const getAllWorkercategorys = (req: Request, res: Response) => {
  res.send('Get all workercategorys');
};

export const getWorkercategoryById = (req: Request, res: Response) => {
  res.send('Get workercategory by ID');
};

export const updateWorkercategoryById = (req: Request, res: Response) => {
  res.send('Update workercategory by ID');
};

export const deleteWorkercategoryById = (req: Request, res: Response) => {
  res.send('Delete workercategory by ID');
};
