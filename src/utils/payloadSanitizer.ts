type GenericPayload = Record<string, any>;

const isPlainObject = (value: unknown): value is GenericPayload =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype ||
    Object.getPrototypeOf(value) === null);

const sanitizeValue = (value: unknown): unknown => {
  if (value === null || value === undefined) return undefined;

  if (Array.isArray(value)) {
    const cleanedArray = value
      .map((item) => sanitizeValue(item))
      .filter((item) => item !== undefined);
    return cleanedArray.length ? cleanedArray : undefined;
  }

  if (isPlainObject(value)) {
    const cleanedObject = Object.entries(value).reduce<GenericPayload>(
      (acc, [key, nestedValue]) => {
        const cleanedValue = sanitizeValue(nestedValue);
        if (cleanedValue !== undefined) {
          acc[key] = cleanedValue;
        }
        return acc;
      },
      {}
    );

    return Object.keys(cleanedObject).length ? cleanedObject : undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    const lowered = trimmed.toLowerCase();
    if (lowered === "true") return true;
    if (lowered === "false") return false;
    return trimmed;
  }

  return value;
};

export const sanitizePayloadObject = (payload: unknown): GenericPayload => {
  if (!isPlainObject(payload)) return {};
  return (sanitizeValue(payload) as GenericPayload) || {};
};

export const normalizePayloadToArray = (payload: unknown): GenericPayload[] => {
  const rows = Array.isArray(payload) ? payload : [payload];
  return rows
    .map((item) => sanitizePayloadObject(item))
    .filter((item) => Object.keys(item).length > 0);
};
