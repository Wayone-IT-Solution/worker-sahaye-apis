import ApiError from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
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
      return new ApiResponse(201, created, "Created successfully");
    } catch (error: any) {
      throw new ApiError(400, error.message || "Creation failed");
    }
  }

  async getById(id: string) {
    const result = await this.model.findById(id);
    if (!result) throw new ApiError(404, "Record not found");
    return new ApiResponse(200, result, "Fetched successfully");
  }

  async getAll(query: any = {}) {
    const { page = 1, limit = 10 } = query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    const { pipeline, matchStage, options } = getPipeline(query);

    const data = await this.model.aggregate(pipeline, options);
    const totalCount = await this.model.countDocuments(matchStage);

    const paginated = paginationResult(
      pageNumber,
      limitNumber,
      totalCount,
      data
    );
    return new ApiResponse(200, paginated, "Data fetched successfully");
  }

  async updateById(id: string, update: UpdateQuery<T>) {
    const updated = await this.model.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
    if (!updated) throw new ApiError(404, "Update failed. Record not found.");
    return new ApiResponse(200, updated, "Updated successfully");
  }

  async deleteById(id: string) {
    const deleted = await this.model.findByIdAndDelete(id);
    if (!deleted) throw new ApiError(404, "Delete failed. Record not found.");
    return new ApiResponse(200, deleted, "Deleted successfully");
  }
}
