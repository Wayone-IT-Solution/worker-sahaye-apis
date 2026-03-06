import { NextFunction, Request, Response } from "express";
import MinimumWage, { IColumnDefinition, IWageRow } from "../../modals/minimumwages.model";
import { CommonService } from "../../services/common.services";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";

const minimumWageService = new CommonService(MinimumWage);
const MINIMUM_WAGE_RESERVED_KEYS = new Set([
  "state",
  "order",
  "note",
  "mode",
  "columns",
  "rowdata",
  "row_index",
  "rowindex",
  "_rowindex",
  "_row_index",
  "_id",
  "createdat",
  "updatedat",
  "__v",
]);

const toNormalizedKey = (value: string): string =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const toLabelFromKey = (key: string): string =>
  key
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const parseNumericString = (value: string): number | null => {
  if (!/^-?\d+(\.\d+)?$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseMinimumWageValue = (value: unknown): unknown => {
  if (value === null || value === undefined) return "";

  if (typeof value === "number" || typeof value === "boolean") return value;

  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return "";

  const numericValue = parseNumericString(trimmed);
  if (numericValue !== null) return numericValue;

  const lower = trimmed.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;

  return trimmed;
};

const inferColumnType = (value: unknown): IColumnDefinition["type"] => {
  if (typeof value === "number") return "number";
  if (typeof value === "string") {
    if (parseNumericString(value) !== null) return "number";
    if (!Number.isNaN(Date.parse(value))) return "date";
  }
  return "string";
};

const normalizeColumnsFromInput = (
  columnsInput: unknown,
  fallbackLabels?: Record<string, string>
): IColumnDefinition[] => {
  if (!columnsInput) return [];
  const parsedColumns: IColumnDefinition[] = [];

  const registerColumn = (
    rawName: unknown,
    rawType?: unknown,
    rawLabel?: unknown,
    rawRequired?: unknown
  ) => {
    const normalizedName = toNormalizedKey(String(rawName || ""));
    if (!normalizedName || MINIMUM_WAGE_RESERVED_KEYS.has(normalizedName)) return;

    const typeValue = String(rawType || "").trim().toLowerCase();
    const resolvedType: IColumnDefinition["type"] =
      typeValue === "number" || typeValue === "date" || typeValue === "string"
        ? (typeValue as IColumnDefinition["type"])
        : "string";

    parsedColumns.push({
      name: normalizedName,
      label:
        String(rawLabel || "").trim() ||
        fallbackLabels?.[normalizedName] ||
        toLabelFromKey(normalizedName),
      type: resolvedType,
      required: Boolean(rawRequired),
    });
  };

  if (Array.isArray(columnsInput)) {
    columnsInput.forEach((entry: any) => {
      registerColumn(entry?.name || entry?.key, entry?.type, entry?.label, entry?.required);
    });
    return parsedColumns;
  }

  if (typeof columnsInput === "string") {
    const trimmed = columnsInput.trim();
    if (!trimmed) return parsedColumns;

    if (
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("{") && trimmed.endsWith("}"))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeColumnsFromInput(parsed, fallbackLabels);
      } catch {
        return parsedColumns;
      }
    }

    trimmed.split(",").forEach((token) => {
      const parts = token
        .split(":")
        .map((part) => part.trim())
        .filter(Boolean);
      if (!parts.length) return;
      registerColumn(parts[0], parts[1], parts[0], parts[2] === "required");
    });
  }

  return parsedColumns;
};

const mergeColumnDefinitions = (
  existing: IColumnDefinition[],
  incoming: IColumnDefinition[]
) => {
  const map = new Map<string, IColumnDefinition>();

  existing.forEach((column) => {
    const key = toNormalizedKey(column?.name || "");
    if (!key) return;
    map.set(key, {
      name: key,
      label: String(column?.label || "").trim() || toLabelFromKey(key),
      type: column?.type || "string",
      required: Boolean(column?.required),
    });
  });

  incoming.forEach((column) => {
    const key = toNormalizedKey(column?.name || "");
    if (!key) return;

    const current = map.get(key);
    if (!current) {
      map.set(key, {
        name: key,
        label: String(column?.label || "").trim() || toLabelFromKey(key),
        type: column?.type || "string",
        required: Boolean(column?.required),
      });
      return;
    }

    if (!current.label && column?.label) {
      current.label = String(column.label).trim();
    }
    if (
      current.type === "string" &&
      (column?.type === "number" || column?.type === "date")
    ) {
      current.type = column.type;
    }
    if (column?.required) current.required = true;
    map.set(key, current);
  });

  return Array.from(map.values());
};

const coerceRowByColumns = (
  row: Record<string, unknown>,
  columns: IColumnDefinition[]
): IWageRow => {
  const result: IWageRow = {};
  const columnMap = new Map(
    columns.map((column) => [toNormalizedKey(column.name), column])
  );

  Object.entries(row).forEach(([rawKey, rawValue]) => {
    const key = toNormalizedKey(rawKey);
    if (!key || MINIMUM_WAGE_RESERVED_KEYS.has(key)) return;

    const column = columnMap.get(key);
    if (!column) return;

    const value = parseMinimumWageValue(rawValue);
    if (value === "" || value === null || value === undefined) return;

    if (column.type === "number") {
      if (typeof value === "number") {
        result[key] = value;
        return;
      }
      const parsed = parseNumericString(String(value));
      if (parsed !== null) {
        result[key] = parsed;
        return;
      }
      result[key] = String(value);
      return;
    }

    if (column.type === "date") {
      result[key] = String(value);
      return;
    }

    result[key] = typeof value === "string" ? value : String(value);
  });

  return result;
};

export class MinimumWageController {
  // Get all unique cities/states with minimum wages
  static async getAllCities(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const wageStates = await MinimumWage.find(
        {},
        { state: 1, _id: 0 }
      ).sort({ order: 1, state: 1 });
      const sortedCities = wageStates.map((item) => item.state);

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
      const query: any = { ...req.query };
      if (!query.sortKey && !query.multiSort) {
        query.multiSort = "order:asc,state:asc";
      }

      const result = await minimumWageService.getAll(query);
      
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
      const { state, columns, note } = req.body;

      // Check if state already exists
      const existing = await MinimumWage.findOne({ state });
      if (existing) {
        return res
          .status(400)
          .json(new ApiError(400, "Wage structure for this state already exists"));
      }

      const newWage = new MinimumWage({
        state,
        note: String(note || "").trim(),
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

  // Update state/city note
  static async updateWageNote(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { state } = req.params;
      const { note } = req.body;

      const query = state.match(/^[0-9a-fA-F]{24}$/)
        ? { _id: state }
        : { state };

      const wage = await MinimumWage.findOneAndUpdate(
        query,
        {
          note: String(note || "").trim(),
          updatedBy: req.body.userId,
        },
        { new: true }
      );

      if (!wage) {
        return res
          .status(404)
          .json(new ApiError(404, "Wage structure not found"));
      }

      return res
        .status(200)
        .json(new ApiResponse(200, wage, "Note updated successfully"));
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

  // Advanced bulk upload for minimum wages (supports additional dynamic columns)
  static async bulkUpsertAdvanced(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const payload = Array.isArray(req.body)
        ? req.body
        : Array.isArray(req.body?.rows)
          ? req.body.rows
          : [];

      if (!payload.length) {
        return res
          .status(400)
          .json(new ApiError(400, "Bulk payload cannot be empty"));
      }

      type GroupedStatePayload = {
        state: string;
        order?: number;
        note?: string;
        mode: "append" | "replace";
        columns: IColumnDefinition[];
        rowAppends: Array<Record<string, unknown>>;
        rowUpdates: Array<{ rowIndex: number; rowData: Record<string, unknown> }>;
      };

      const grouped = new Map<string, GroupedStatePayload>();

      payload.forEach((item: any, index: number) => {
        const rowNumber = index + 1;
        const state = String(item?.state || "").trim();
        if (!state) {
          throw new Error(`Row ${rowNumber}: "state" is required`);
        }

        const groupKey = state.toLowerCase();
        const modeRaw = String(item?.mode || req.body?.mode || "append")
          .trim()
          .toLowerCase();
        const mode: "append" | "replace" = modeRaw === "replace" ? "replace" : "append";

        if (!grouped.has(groupKey)) {
          grouped.set(groupKey, {
            state,
            mode,
            columns: [],
            rowAppends: [],
            rowUpdates: [],
          });
        }

        const group = grouped.get(groupKey)!;
        group.mode = mode;

        const orderValue = parseNumericString(String(item?.order ?? "").trim());
        if (orderValue !== null) {
          group.order = orderValue;
        }
        if (item?.note !== undefined && item?.note !== null) {
          group.note = String(item.note).trim();
        }

        const labelMap: Record<string, string> = {};
        const dynamicRowData: Record<string, unknown> = {};

        if (item?.rowData && typeof item.rowData === "object" && !Array.isArray(item.rowData)) {
          Object.entries(item.rowData).forEach(([rawKey, rawValue]) => {
            const normalizedKey = toNormalizedKey(rawKey);
            if (!normalizedKey || MINIMUM_WAGE_RESERVED_KEYS.has(normalizedKey)) return;
            labelMap[normalizedKey] = String(rawKey || "").trim() || toLabelFromKey(normalizedKey);
            dynamicRowData[normalizedKey] = parseMinimumWageValue(rawValue);
          });
        }

        Object.entries(item || {}).forEach(([rawKey, rawValue]) => {
          const normalizedKey = toNormalizedKey(rawKey);
          if (!normalizedKey || MINIMUM_WAGE_RESERVED_KEYS.has(normalizedKey)) return;
          if (rawValue === null || rawValue === undefined || String(rawValue).trim() === "") return;
          labelMap[normalizedKey] = String(rawKey || "").trim() || toLabelFromKey(normalizedKey);
          dynamicRowData[normalizedKey] = parseMinimumWageValue(rawValue);
        });

        const explicitColumns = normalizeColumnsFromInput(item?.columns, labelMap);
        const inferredColumns: IColumnDefinition[] = Object.entries(dynamicRowData).map(
          ([key, value]) => ({
            name: key,
            label: labelMap[key] || toLabelFromKey(key),
            type: inferColumnType(value),
            required: false,
          })
        );

        group.columns = mergeColumnDefinitions(group.columns, [
          ...explicitColumns,
          ...inferredColumns,
        ]);

        const rowIndexRaw = item?.rowIndex ?? item?._rowIndex;
        const rowIndexNumber =
          rowIndexRaw === undefined || rowIndexRaw === null || String(rowIndexRaw).trim() === ""
            ? null
            : Number(rowIndexRaw);

        if (Object.keys(dynamicRowData).length) {
          if (rowIndexNumber !== null && Number.isInteger(rowIndexNumber) && rowIndexNumber >= 0) {
            group.rowUpdates.push({
              rowIndex: rowIndexNumber,
              rowData: dynamicRowData,
            });
          } else {
            group.rowAppends.push(dynamicRowData);
          }
        }
      });

      const summary = {
        totalStates: grouped.size,
        createdCount: 0,
        updatedCount: 0,
        rowsAdded: 0,
        rowsUpdated: 0,
        failed: [] as Array<{ state: string; message: string }>,
      };

      for (const statePayload of grouped.values()) {
        try {
          const existing = await MinimumWage.findOne({ state: statePayload.state });
          const finalColumns = mergeColumnDefinitions(
            existing?.columns || [],
            statePayload.columns
          );

          const normalizedAppends = statePayload.rowAppends
            .map((row) => coerceRowByColumns(row, finalColumns))
            .filter((row) => Object.keys(row).length > 0);

          if (!existing) {
            const createdRows = [...normalizedAppends];
            statePayload.rowUpdates.forEach((update) => {
              if (update.rowIndex < 0) return;
              if (update.rowIndex >= createdRows.length) return;
              createdRows[update.rowIndex] = {
                ...createdRows[update.rowIndex],
                ...coerceRowByColumns(update.rowData, finalColumns),
              };
              summary.rowsUpdated += 1;
            });

            const doc = new MinimumWage({
              state: statePayload.state,
              order: statePayload.order ?? 0,
              note: String(statePayload.note || ""),
              columns: finalColumns,
              rows: createdRows,
              createdBy: String(req.body?.userId || ""),
              updatedBy: String(req.body?.userId || ""),
            });
            await doc.save();

            summary.createdCount += 1;
            summary.rowsAdded += createdRows.length;
            continue;
          }

          existing.columns = finalColumns;
          if (statePayload.order !== undefined) {
            existing.order = statePayload.order;
          }
          if (statePayload.note !== undefined) {
            existing.note = String(statePayload.note || "");
          }

          if (statePayload.mode === "replace") {
            existing.rows = [...normalizedAppends];
          } else {
            existing.rows.push(...normalizedAppends);
          }

          summary.rowsAdded += normalizedAppends.length;

          statePayload.rowUpdates.forEach((update) => {
            if (update.rowIndex < 0 || update.rowIndex >= existing.rows.length) {
              return;
            }
            const currentRow = (existing.rows[update.rowIndex] || {}) as IWageRow;
            existing.rows[update.rowIndex] = {
              ...currentRow,
              ...coerceRowByColumns(update.rowData, finalColumns),
            };
            summary.rowsUpdated += 1;
          });

          existing.updatedBy = String(req.body?.userId || "");
          await existing.save();
          summary.updatedCount += 1;
        } catch (error) {
          summary.failed.push({
            state: statePayload.state,
            message: error instanceof Error ? error.message : "Failed to process state",
          });
        }
      }

      const hasFailures = summary.failed.length > 0;
      const responseStatus = hasFailures ? 207 : 200;
      return res.status(responseStatus).json(
        new ApiResponse(
          responseStatus,
          summary,
          hasFailures
            ? "Minimum wages bulk upload completed with partial failures"
            : "Minimum wages bulk upload completed successfully"
        )
      );
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
