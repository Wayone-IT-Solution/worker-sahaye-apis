import { User } from "../modals/user.model";

export const POINTS_PER_RUPEE = 10;
export const MAX_POINTS_REDEMPTION_PERCENT = 50;

export const normalizePoints = (points?: number) => {
  const value = Number(points);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
};

export const calculatePointsRedemption = (
  amount: number,
  requestedPoints: number,
  availablePoints: number,
) => {
  const safeAmount = Math.max(0, Math.floor(amount));
  const maxRedeemableRupees = Math.floor(
    (safeAmount * MAX_POINTS_REDEMPTION_PERCENT) / 100,
  );

  const requestedRupees = Math.floor(
    normalizePoints(requestedPoints) / POINTS_PER_RUPEE,
  );
  const availableRupees = Math.floor(
    normalizePoints(availablePoints) / POINTS_PER_RUPEE,
  );

  const redeemableRupees = Math.min(
    maxRedeemableRupees,
    requestedRupees,
    availableRupees,
  );

  const redeemablePoints = redeemableRupees * POINTS_PER_RUPEE;

  return {
    redeemableRupees,
    redeemablePoints,
  };
};

export const redeemUserPoints = async (
  userId: string,
  amount: number,
  requestedPoints: number,
) => {
  const normalizedRequested = normalizePoints(requestedPoints);
  if (normalizedRequested <= 0) {
    return { pointsRedeemed: 0, pointsValue: 0, finalAmount: amount };
  }

  const user = await User.findById(userId).select("pointsEarned");
  const availablePoints = user?.pointsEarned ?? 0;

  const { redeemablePoints, redeemableRupees } = calculatePointsRedemption(
    amount,
    normalizedRequested,
    availablePoints,
  );

  if (redeemablePoints <= 0 || redeemableRupees <= 0) {
    return { pointsRedeemed: 0, pointsValue: 0, finalAmount: amount };
  }

  const updated = await User.findOneAndUpdate(
    { _id: userId, pointsEarned: { $gte: redeemablePoints } },
    { $inc: { pointsEarned: -redeemablePoints } },
    { new: true },
  );

  if (!updated) {
    return { pointsRedeemed: 0, pointsValue: 0, finalAmount: amount };
  }

  const finalAmount = Math.max(0, Math.floor(amount) - redeemableRupees);

  return {
    pointsRedeemed: redeemablePoints,
    pointsValue: redeemableRupees,
    finalAmount,
  };
};

export const refundUserPoints = async (userId: string, points: number) => {
  const normalized = normalizePoints(points);
  if (normalized <= 0) return;
  await User.findByIdAndUpdate(userId, { $inc: { pointsEarned: normalized } });
};
