import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { scopedPrisma } from "./tenantScope.js";
import { rawPrisma } from "../db.js";

/**
 * The one test suite that must never be skipped or weakened: it exists to
 * prove that a session scoped to org A can never read, update, or delete
 * org B's rows, no matter what it asks for. Every subsequent PR that touches
 * `tenantScope.ts` or adds a tenant-scoped model must keep this passing.
 *
 * Requires a real (test) database — set DATABASE_URL to a disposable Postgres
 * instance before running `npm test`. Never run this against a database with
 * real data; it creates and deletes organizations.
 */
describe("tenant isolation", () => {
  let orgAId: string;
  let orgBId: string;
  let userAId: string;
  let userBId: string;
  let courseAId: string;

  beforeAll(async () => {
    const orgA = await rawPrisma.organization.create({ data: { name: "Org A — test" } });
    const orgB = await rawPrisma.organization.create({ data: { name: "Org B — test" } });
    orgAId = orgA.id;
    orgBId = orgB.id;

    const userA = await rawPrisma.user.create({
      data: { orgId: orgAId, name: "Alice", email: "alice@org-a.test", passwordHash: "x" },
    });
    const userB = await rawPrisma.user.create({
      data: { orgId: orgBId, name: "Bob", email: "bob@org-b.test", passwordHash: "x" },
    });
    userAId = userA.id;
    userBId = userB.id;

    const courseA = await rawPrisma.course.create({
      data: { orgId: orgAId, title: "Org A's course", createdByUserId: userAId },
    });
    courseAId = courseA.id;
  });

  afterAll(async () => {
    // Cascades clean up users/courses/etc. via schema.prisma's onDelete rules.
    await rawPrisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await rawPrisma.$disconnect();
  });

  it("a findMany scoped to org B never returns org A's rows", async () => {
    const dbB = scopedPrisma(orgBId);
    const courses = await dbB.course.findMany({});
    expect(courses.find((c) => c.id === courseAId)).toBeUndefined();
  });

  it("a findUnique for org A's row by id, scoped to org B, returns null", async () => {
    const dbB = scopedPrisma(orgBId);
    const course = await dbB.course.findUnique({ where: { id: courseAId } });
    expect(course).toBeNull();
  });

  it("an update targeting org A's row, scoped to org B, throws rather than succeeding", async () => {
    const dbB = scopedPrisma(orgBId);
    await expect(
      dbB.course.update({ where: { id: courseAId }, data: { title: "hijacked" } }),
    ).rejects.toThrow();

    // And the row is provably untouched.
    const untouched = await rawPrisma.course.findUnique({ where: { id: courseAId } });
    expect(untouched?.title).toBe("Org A's course");
  });

  it("a delete targeting org A's row, scoped to org B, throws rather than succeeding", async () => {
    const dbB = scopedPrisma(orgBId);
    await expect(dbB.course.delete({ where: { id: courseAId } })).rejects.toThrow();

    const stillExists = await rawPrisma.course.findUnique({ where: { id: courseAId } });
    expect(stillExists).not.toBeNull();
  });

  it("a create through a scoped client is always stamped with that client's orgId, ignoring any orgId the caller passes", async () => {
    const dbB = scopedPrisma(orgBId);
    const created = await dbB.course.create({
      // Deliberately trying to smuggle a different org's id — `orgId` is a
      // real field on the model, so this is valid input type-wise; the
      // extension is what's responsible for refusing to honor it.
      data: { orgId: orgAId, title: "Should still land in org B", createdByUserId: userBId },
    });
    expect(created.orgId).toBe(orgBId);
  });

  it("the correct org can still read its own data normally", async () => {
    const dbA = scopedPrisma(orgAId);
    const courses = await dbA.course.findMany({});
    expect(courses.some((c) => c.id === courseAId)).toBe(true);
  });
});
