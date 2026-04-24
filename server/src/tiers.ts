export type Tier = "free" | "student" | "pro" | "admin";

export const TIER_LIMITS = {
  free:    { projects: 5,        pdfsPerProject: 3,  maxFileSizeMb: 15 },
  student: { projects: 20,       pdfsPerProject: 5,  maxFileSizeMb: 25 },
  pro:     { projects: Infinity, pdfsPerProject: 10, maxFileSizeMb: 50 },
  admin:   { projects: Infinity, pdfsPerProject: 10, maxFileSizeMb: 50 },
} as const;

export type TierLimits = (typeof TIER_LIMITS)[Tier];
