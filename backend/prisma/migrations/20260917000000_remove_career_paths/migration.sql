-- Remove the Career Path feature (skill-based path recommendations) per
-- client request — replaced by the existing LearningPlan concept (a group
-- of LearningPaths). Confirmed only one stray test row before writing this
-- (a leftover fixture from an interrupted test run, empty skillIds) — a
-- clean drop, nothing real lost.
DROP TABLE "CareerPath";
