import type { FeatureStatus } from "./types";

// Kept apart from `features.ts` (which talks to the database) so client components can import
// the limits — for `maxLength` on the form — without pulling Prisma into the browser bundle.

export const FEATURE_TITLE_MIN = 4;
export const FEATURE_TITLE_MAX = 100;
export const FEATURE_DESCRIPTION_MAX = 1000;
/** Anti-spam ceiling on how many requests one user can file in a rolling 24 hours. */
export const FEATURE_REQUESTS_PER_DAY = 5;

export const FEATURE_STATUSES: FeatureStatus[] = ["open", "planned", "in_progress", "shipped", "declined"];
