export const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const TRANSFER_STATUS = {
  LISTED: "listed",
  ENDED: "ended",
  SOLD: "sold",
  NOT_SOLD: "not_sold",
  EXPIRED: "expired",
} as const;

export type TransferStatus =
  (typeof TRANSFER_STATUS)[keyof typeof TRANSFER_STATUS];

export const MARKET_STUDY_STATUS = {
  ACTIVE: "active",
} as const;
