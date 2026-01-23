/**
 * Save Helper Utilities
 */

/**
 * Get current month in YYYY-MM format
 */
export const getCurrentMonthYear = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};
