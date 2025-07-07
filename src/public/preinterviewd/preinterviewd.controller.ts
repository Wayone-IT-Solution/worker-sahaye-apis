// Preinterviewd Controller
import { Request, Response } from 'express';

export const createPreinterviewd = (req: Request, res: Response) => {
  res.send('Create preinterviewd');
};

export const getAllPreinterviewds = (req: Request, res: Response) => {
  res.send('Get all preinterviewds');
};

export const getPreinterviewdById = (req: Request, res: Response) => {
  res.send('Get preinterviewd by ID');
};

export const updatePreinterviewdById = (req: Request, res: Response) => {
  res.send('Update preinterviewd by ID');
};

export const deletePreinterviewdById = (req: Request, res: Response) => {
  res.send('Delete preinterviewd by ID');
};
