import { IUser } from "../modals/user.model";

/**
 * Check if user has premium access (either through premium plan or early access badge)
 * @param user User object or user with hasPremiumPlan and hasEarlyAccessBadge fields
 * @returns boolean - true if user has premium access
 */
export const hasPremiumAccess = (user: Partial<IUser> | any): boolean => {
  if (!user) return false;
  return user.hasPremiumPlan === true || user.hasEarlyAccessBadge === true;
};

/**
 * Check if user has early access badge
 * @param user User object
 * @returns boolean
 */
export const hasEarlyAccessBadge = (user: Partial<IUser> | any): boolean => {
  if (!user) return false;
  return user.hasEarlyAccessBadge === true;
};

/**
 * Get premium status info
 * @param user User object
 * @returns Object with premium info
 */
export const getPremiumInfo = (user: Partial<IUser> | any) => {
  return {
    hasPremium: hasPremiumAccess(user),
    hasEarlyAccess: hasEarlyAccessBadge(user),
    premiumType: hasEarlyAccessBadge(user) ? "early-access" : (user.hasPremiumPlan ? "premium" : "free"),
  };
};
