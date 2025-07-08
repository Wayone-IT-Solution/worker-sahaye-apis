// Bulkhiring Controller
import { Request, Response } from 'express';

export const createBulkhiring = (req: Request, res: Response) => {
  res.send('Create bulkhiring');
};

export const getAllBulkhirings = (req: Request, res: Response) => {
  res.send('Get all bulkhirings');
};

export const getBulkhiringById = (req: Request, res: Response) => {
  res.send('Get bulkhiring by ID');
};

export const updateBulkhiringById = (req: Request, res: Response) => {
  res.send('Update bulkhiring by ID');
};

export const deleteBulkhiringById = (req: Request, res: Response) => {
  res.send('Delete bulkhiring by ID');
};
