import { SequenceCounter } from "../modals/sequencecounter.model";

const PAD_LENGTH = 6;

const getCounterKey = (entity: string, year: number) => `${entity}:${year}`;

export const getNextYearlyUniqueCode = async (
  prefix: string,
  entity: string,
  date = new Date(),
): Promise<string> => {
  const year = date.getFullYear();
  const counterKey = getCounterKey(entity, year);

  const counter = await SequenceCounter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

  const nextSequence = Number(counter?.seq || 0);
  const serial = String(nextSequence).padStart(PAD_LENGTH, "0");
  const yearShort = String(year).slice(-2); // Get last 2 digits of year (e.g., 26 from 2026)
  
  // For user, personalassistant, and personalassistantinfo entities, use new format without hyphens
  // Format: {prefix}{year_short}{serial} (e.g., WSPA26000001)
  if (entity === "user" || entity === "personalassistant" || entity === "personalassistantinfo") {
    return `${prefix}${yearShort}${serial}`;
  }
  
  return `${prefix}-${year}-${serial}`;
};

