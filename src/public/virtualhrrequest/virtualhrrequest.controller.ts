// Virtualhrrequest Controller
import { Request, Response } from 'express';

export const createVirtualhrrequest = (req: Request, res: Response) => {
  res.send('Create virtualhrrequest');
};

export const getAllVirtualhrrequests = (req: Request, res: Response) => {
  res.send('Get all virtualhrrequests');
};

export const getVirtualhrrequestById = (req: Request, res: Response) => {
  res.send('Get virtualhrrequest by ID');
};

export const updateVirtualhrrequestById = (req: Request, res: Response) => {
  res.send('Update virtualhrrequest by ID');
};

export const deleteVirtualhrrequestById = (req: Request, res: Response) => {
  res.send('Delete virtualhrrequest by ID');
};
