// Projectbasedhiring Controller
import { Request, Response } from 'express';

export const createProjectbasedhiring = (req: Request, res: Response) => {
  res.send('Create projectbasedhiring');
};

export const getAllProjectbasedhirings = (req: Request, res: Response) => {
  res.send('Get all projectbasedhirings');
};

export const getProjectbasedhiringById = (req: Request, res: Response) => {
  res.send('Get projectbasedhiring by ID');
};

export const updateProjectbasedhiringById = (req: Request, res: Response) => {
  res.send('Update projectbasedhiring by ID');
};

export const deleteProjectbasedhiringById = (req: Request, res: Response) => {
  res.send('Delete projectbasedhiring by ID');
};
