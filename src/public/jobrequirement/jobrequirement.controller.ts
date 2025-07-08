// Jobrequirement Controller
import { Request, Response } from 'express';

export const createJobrequirement = (req: Request, res: Response) => {
  res.send('Create jobrequirement');
};

export const getAllJobrequirements = (req: Request, res: Response) => {
  res.send('Get all jobrequirements');
};

export const getJobrequirementById = (req: Request, res: Response) => {
  res.send('Get jobrequirement by ID');
};

export const updateJobrequirementById = (req: Request, res: Response) => {
  res.send('Update jobrequirement by ID');
};

export const deleteJobrequirementById = (req: Request, res: Response) => {
  res.send('Delete jobrequirement by ID');
};
