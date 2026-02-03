import { NextFunction, Request, Response } from "express";
import MinimumWage, { IColumnDefinition, IWageRow } from "../../modals/minimumwages.model";
import { CommonService } from "../../services/common.services";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";

const minimumWageService = new CommonService(MinimumWage);

export class MinimumWageController {
  // Get all unique cities/states with minimum wages
  static async getAllCities(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // Get all unique states from the minimumwages collection
      const cities = await MinimumWage.distinct("state");
      
      // Sort cities alphabetically
      const sortedCities = cities.sort();

      return res
        .status(200)
        .json(new ApiResponse(200, sortedCities, "Cities fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  // Get all wage structures with pagination
  static async getAllWages(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await minimumWageService.getAll(req.query);
      
      // Handle both array and object responses
      let enrichedData: any;
      
      if (Array.isArray(result)) {
        // If result is an array, enrich it directly
        enrichedData = result.map((wage: any) => ({
          ...wage,
          columnsCount: wage.columns?.length || 0,
          rowsCount: wage.rows?.length || 0,
        }));
      } else if (result.result) {
        // If result has a result property with pagination
        enrichedData = {
          ...result,
          result: result.result.map((wage: any) => ({
            ...wage,
            columnsCount: wage.columns?.length || 0,
            rowsCount: wage.rows?.length || 0,
          })),
        };
      } else {
        // Default case
        enrichedData = result;
      }
      
      return res
        .status(200)
        .json(new ApiResponse(200, enrichedData, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  // Get wage data by state or ID
  static async getWageByState(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { state } = req.params;
      
      // Try to find by _id first (if it's a valid MongoDB ID), then by state name
      let wage = null;
      
      // Check if state is a valid MongoDB ID
      if (state.match(/^[0-9a-fA-F]{24}$/)) {
        wage = await MinimumWage.findById(state);
      } else {
        // Otherwise find by state name
        wage = await MinimumWage.findOne({ state });
      }
      
      if (!wage) {
        return res
          .status(404)
          .json(new ApiError(404, "Wage structure not found"));
      }
      return res
        .status(200)
        .json(new ApiResponse(200, wage, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  // Create wage structure for a state
  static async createWageStructure(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { state, columns } = req.body;

      // Check if state already exists
      const existing = await MinimumWage.findOne({ state });
      if (existing) {
        return res
          .status(400)
          .json(new ApiError(400, "Wage structure for this state already exists"));
      }

      const newWage = new MinimumWage({
        state,
        columns,
        rows: [],
        createdBy: req.body.userId,
      });

      await newWage.save();
      return res
        .status(201)
        .json(new ApiResponse(201, newWage, "Wage structure created successfully"));
    } catch (err) {
      next(err);
    }
  }

  // Update columns for a state
  static async updateColumns(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { state } = req.params;
      const { columns } = req.body;

      const wage = await MinimumWage.findOneAndUpdate(
        { state },
        { columns, updatedBy: req.body.userId },
        { new: true }
      );

      if (!wage) {
        return res
          .status(404)
          .json(new ApiError(404, "Wage structure not found"));
      }

      return res
        .status(200)
        .json(new ApiResponse(200, wage, "Columns updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  // Add wage row data
  static async addWageRow(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { state } = req.params;
      const { rowData } = req.body;

      const wage = await MinimumWage.findOne({ state });
      if (!wage) {
        return res
          .status(404)
          .json(new ApiError(404, "Wage structure not found"));
      }

      wage.rows.push(rowData);
      wage.updatedBy = req.body.userId;
      await wage.save();

      return res
        .status(200)
        .json(new ApiResponse(200, wage, "Row added successfully"));
    } catch (err) {
      next(err);
    }
  }

  // Add multiple wage rows
  static async addMultipleWageRows(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { state } = req.params;
      const { rows } = req.body;

      const wage = await MinimumWage.findOne({ state });
      if (!wage) {
        return res
          .status(404)
          .json(new ApiError(404, "Wage structure not found"));
      }

      wage.rows = [...wage.rows, ...rows];
      wage.updatedBy = req.body.userId;
      await wage.save();

      return res
        .status(200)
        .json(new ApiResponse(200, wage, "Rows added successfully"));
    } catch (err) {
      next(err);
    }
  }

  // Update a wage row
  static async updateWageRow(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { state, rowIndex } = req.params;
      const { rowData } = req.body;
      const index = parseInt(rowIndex, 10);

      const wage = await MinimumWage.findOne({ state });
      if (!wage) {
        return res
          .status(404)
          .json(new ApiError(404, "Wage structure not found"));
      }

      if (index < 0 || index >= wage.rows.length) {
        return res
          .status(400)
          .json(new ApiError(400, "Invalid row index"));
      }

      wage.rows[index] = rowData;
      wage.updatedBy = req.body.userId;
      await wage.save();

      return res
        .status(200)
        .json(new ApiResponse(200, wage, "Row updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  // Delete a wage row
  static async deleteWageRow(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { state, rowIndex } = req.params;

      const wage = await MinimumWage.findOne({ state });
      if (!wage) {
        return res
          .status(404)
          .json(new ApiError(404, "Wage structure not found"));
      }

      wage.rows.splice(parseInt(rowIndex), 1);
      wage.updatedBy = req.body.userId;
      await wage.save();

      return res
        .status(200)
        .json(new ApiResponse(200, wage, "Row deleted successfully"));
    } catch (err) {
      next(err);
    }
  }

  // Delete entire state wage structure
  static async deleteWageStructure(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { state } = req.params;

      // Try to find by _id first (if it's a valid MongoDB ID), then by state name
      let result;
      
      // Check if state is a valid MongoDB ID
      if (state.match(/^[0-9a-fA-F]{24}$/)) {
        result = await MinimumWage.deleteOne({ _id: state });
      } else {
        // Otherwise delete by state name
        result = await MinimumWage.deleteOne({ state });
      }

      if (result.deletedCount === 0) {
        return res
          .status(404)
          .json(new ApiError(404, "Wage structure not found"));
      }

      return res
        .status(200)
        .json(new ApiResponse(200, null, "Wage structure deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
