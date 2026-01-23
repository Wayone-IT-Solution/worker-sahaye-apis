import { SaveType, ReferenceType } from "../../modals/saveitems.model";

/**
 * Validation rules for SaveItem operations
 */

export interface SaveItemValidationRequest {
  referenceId?: string;
  referenceType?: ReferenceType;
  saveType?: SaveType;
}

/**
 * Validate save item request
 */
export const validateSaveItemRequest = (
  data: SaveItemValidationRequest,
): string[] => {
  const errors: string[] = [];

  if (!data.referenceId) {
    errors.push("referenceId is required");
  }

  if (!data.referenceType) {
    errors.push("referenceType is required");
  } else if (!Object.values(ReferenceType).includes(data.referenceType)) {
    errors.push(
      `Invalid referenceType. Must be one of: ${Object.values(ReferenceType).join(", ")}`,
    );
  }

  if (!data.saveType) {
    errors.push("saveType is required");
  } else if (!Object.values(SaveType).includes(data.saveType)) {
    errors.push(
      `Invalid saveType. Must be one of: ${Object.values(SaveType).join(", ")}`,
    );
  }

  return errors;
};
