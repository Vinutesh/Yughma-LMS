import { defineConfig } from "vitest/config";

/**
 * Every test file here hits the same real Neon database. Running files in
 * parallel means each opens its own connections against a pooler with a
 * limited free-tier slot count — exactly what caused signup.test.ts's
 * timeouts (and one deeply confusing false-positive "account already
 * exists" on a brand-new email) the first time this ran. One file at a time
 * avoids contending for the pool; it costs some wall-clock time, which is
 * the right trade for tests that mutate a real shared resource.
 */
export default defineConfig({
  test: {
    fileParallelism: false,
    testTimeout: 15_000,
    // `learningCrossOrg.test.ts`'s `beforeAll` does ~15 sequential creates
    // (course, module, lesson, enrollment, assignment, submission, quiz,
    // question, asset, template, certificate) against Neon's real network
    // latency — same class of timeout `signup.test.ts`'s transaction hit
    // before its own timeout was raised. Hooks default to 10s; this doesn't.
    hookTimeout: 30_000,
  },
});
