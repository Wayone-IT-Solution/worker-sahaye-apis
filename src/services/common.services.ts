import ApiError from "../utils/ApiError";
import { Model, Document, UpdateQuery } from "mongoose";
import { getPipeline, paginationResult } from "../utils/helper";

export class CommonService<T extends Document> {
  private model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  async create(data: Partial<T>) {
    try {
      const created = await this.model.create(data);
      return created;
    } catch (error: any) {
      throw error;
    }
  }

  async getById(id: string) {
    try {
      const result = await this.model.findById(id);
      if (!result) throw new Error("Record not found");
      return result;
    } catch (error) {
      throw error;
    }
  }

  async getAll(query: any = {}, optionsToBeExtract?: any) {
    try {
      const { page = 1, limit = 10 } = query;
      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);

      const { pipeline, matchStage, options } = getPipeline(
        query,
        optionsToBeExtract
      );

      const data = await this.model.aggregate(pipeline, options);
      const totalCount = await this.model.countDocuments(matchStage);

      const paginated = paginationResult(
        pageNumber,
        limitNumber,
        totalCount,
        data
      );
      return paginated;
    } catch (error: any) {
      throw new ApiError(500, error.message || "Failed to fetch data");
    }
  }

  async updateById(id: string, update: UpdateQuery<T>) {
    try {
      const updated = await this.model.findByIdAndUpdate(id, update, {
        new: true,
        runValidators: true,
      });
      if (!updated) throw new Error("Record not found for update");
      return updated;
    } catch (error) {
      throw error;
    }
  }

  async deleteById(id: string) {
    try {
      const deleted = await this.model.findByIdAndDelete(id);
      if (!deleted) throw new Error("Record not found for delete");
      return deleted;
    } catch (error) {
      throw error;
    }
  }
}
