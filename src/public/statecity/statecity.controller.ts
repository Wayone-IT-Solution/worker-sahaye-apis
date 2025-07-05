import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { indianStates, region } from "../../config/data";
import { NextFunction, Request, Response } from "express";
import { City, State } from "../../modals/statecity.model";
import { CommonService } from "../../services/common.services";

const cityService = new CommonService(City);
const stateService = new CommonService(State);

export class StateCityController {
  static async createStateCity(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { state, city } = req.query;
      const insertCities = city === "true";
      const insertStates = state === "true";
      const { states = [], cities = [] } = req.body;

      const insertedStates: any[] = [];
      const insertedCities: any[] = [];

      // ================== INSERT STATES ==================
      if (insertStates && Array.isArray(indianStates) && indianStates.length) {
        const stateResult = await State.insertMany(indianStates, {
          ordered: false,
        });
        insertedStates.push(...stateResult);
      }

      if (states.length) {
        const stateResult = await State.insertMany(states, { ordered: false });
        insertedStates.push(...stateResult);
      }

      // ================== INSERT CITIES ==================
      if (insertCities) {
        for (const state of indianStates) {
          const stateDoc = await State.findOne(
            { name: state.name },
            { _id: 1 }
          );
          if (!stateDoc || !region[state.name]) continue;

          const cityPayload = region[state.name].map((cityName: string) => ({
            name: cityName,
            stateId: stateDoc._id,
            isCapital: cityName === state.name,
          }));

          const cityResult = await City.insertMany(cityPayload, {
            ordered: false,
          });
          insertedCities.push(...cityResult);
        }
      }

      if (cities.length) {
        const preparedCities = [];

        for (const city of cities) {
          const stateDoc = await State.findOne(
            { name: city.stateName },
            { _id: 1 }
          );
          if (!stateDoc) continue;

          preparedCities.push({
            name: city.name,
            stateId: stateDoc._id,
            isCapital: !!city.isCapital,
          });
        }

        if (preparedCities.length) {
          const cityResult = await City.insertMany(preparedCities, {
            ordered: false,
          });
          insertedCities.push(...cityResult);
        }
      }

      return res.status(201).json(
        new ApiResponse(
          201,
          {
            insertedStates: insertedStates.length,
            insertedCities: insertedCities.length,
          },
          "Data inserted successfully"
        )
      );
    } catch (err) {
      next(err);
    }
  }

  static async getAllStateCitys(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { city, stateId } = req.query;

      // 🏙 Fetch Cities by State ID
      if (city === "true") {
        if (!stateId || typeof stateId !== "string")
          return res
            .status(400)
            .json(new ApiError(400, "Missing or invalid stateId in query"));

        const cities = await City.find({ stateId }, { _id: 1, name: 1 });
        return res
          .status(200)
          .json(new ApiResponse(200, cities, "Cities fetched successfully"));
      }

      // 🌍 Fetch All States
      const states = await State.find({}, { _id: 1, name: 1, code: 1 });
      return res
        .status(200)
        .json(new ApiResponse(200, states, "States fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async createState(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await stateService.create(req.body);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create state"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllStates(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const states = await stateService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, states, "States fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getStateById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await stateService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "state not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateStateById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await stateService.updateById(
        req.params.id,
        req.body
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update state"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteStateById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await stateService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete state"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllCity(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const pipeline = [{
        $lookup: {
          from: "states",
          localField: "stateId",
          foreignField: "_id",
          as: "stateData",
        },
      },
      { $unwind: "$stateData" },
      {
        $project: {
          _id: 1,
          name: 1,
          stateId: 1,
          isCapital: 1,
          stateName: "$stateData.name",
          stateCode: "$stateData.code",
        },
      }];
      const states = await cityService.getAll(req.query, pipeline);
      return res
        .status(200)
        .json(new ApiResponse(200, states, "States fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async createCity(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await cityService.create(req.body);
      if (!result)
        return res
          .status(400)
          .json(new ApiError(400, "Failed to create city"));
      return res
        .status(201)
        .json(new ApiResponse(201, result, "Created successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getCityById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await cityService.getById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "city not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateCityById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await cityService.updateById(
        req.params.id,
        req.body
      );
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to update city"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteCityById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await cityService.deleteById(req.params.id);
      if (!result)
        return res
          .status(404)
          .json(new ApiError(404, "Failed to delete city"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
