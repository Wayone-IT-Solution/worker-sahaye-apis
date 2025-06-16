// Enrollment Controller
import { Request, Response } from 'express';

export const createEnrollment = (req: Request, res: Response) => {
  res.send('Create enrollment');
};

export const getAllEnrollments = (req: Request, res: Response) => {
  res.send('Get all enrollments');
};

export const getEnrollmentById = (req: Request, res: Response) => {
  res.send('Get enrollment by ID');
};

export const updateEnrollmentById = (req: Request, res: Response) => {
  res.send('Update enrollment by ID');
};

export const deleteEnrollmentById = (req: Request, res: Response) => {
  res.send('Delete enrollment by ID');
};
