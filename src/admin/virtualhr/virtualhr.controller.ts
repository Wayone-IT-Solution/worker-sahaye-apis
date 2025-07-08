// Virtualhr Controller
import { Request, Response } from 'express';

export const createVirtualhr = (req: Request, res: Response) => {
  res.send('Create virtualhr');
};

export const getAllVirtualhrs = (req: Request, res: Response) => {
  res.send('Get all virtualhrs');
};

export const getVirtualhrById = (req: Request, res: Response) => {
  res.send('Get virtualhr by ID');
};

export const updateVirtualhrById = (req: Request, res: Response) => {
  res.send('Update virtualhr by ID');
};

export const deleteVirtualhrById = (req: Request, res: Response) => {
  res.send('Delete virtualhr by ID');
};
