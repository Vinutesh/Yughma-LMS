import crypto from "node:crypto";
import { rawPrisma } from "../src/db.js";
import { hashPassword } from "../src/auth/password.js";

/**
 * Seeds the ONE Yughma Tech platform organization (`isPlatform: true`) and
 * its first admin account — the account that creates every client company,
 * every learner, and every course from here on (see `routers/platform.ts`
 * and `trpc.ts`'s `requirePlatformAdmin`). There is no more public
 * self-signup and no more per-client demo seed — client companies get
 * created through the platform admin's own account instead.
 *
 * Retires the old "Acme Corp" mock-era demo org if it still exists — that
 * data predates the platform-admin model (its "Org Admin" role held
 * `courses:manage`, which a client org must never hold now) and was chosen
 * to be discarded rather than migrated. Cascades (`onDelete: Cascade` on
 * `User.org`, `Course.org`, etc.) take everything under it with it.
 *
 * Idempotent: safe to run more than once — skips creating Yughma Tech again
 * if a platform org already exists.
 */
async function main() {
  const staleAcme = await rawPrisma.organization.findFirst({ where: { name: "Acme Corp" } });
  if (staleAcme) {
    await rawPrisma.organization.delete({ where: { id: staleAcme.id } });
    console.log(`Removed stale demo org "Acme Corp" (${staleAcme.id}).`);
  }

  const existingPlatform = await rawPrisma.organization.findFirst({ where: { isPlatform: true } });
  if (existingPlatform) {
    console.log(`Platform org already exists (${existingPlatform.id}) — skipping seed.`);
    return;
  }

  const org = await rawPrisma.organization.create({
    data: { name: "Yughma Tech", isPlatform: true },
  });

  const role = await rawPrisma.role.create({
    data: {
      orgId: org.id,
      name: "Platform Admin",
      isSystemRole: true,
      permissions: {
        create: [
          { resource: "platform", action: "manage" },
          { resource: "courses", action: "manage" },
          { resource: "users", action: "manage" },
          { resource: "roles", action: "manage" },
          { resource: "settings", action: "manage" },
          { resource: "reports", action: "view" },
          { resource: "team", action: "view" },
        ],
      },
    },
  });

  const email = "tech@yughma.com";
  // A real credential, not a shared demo password — printed once, here,
  // for the operator to relay to themselves and change on first login.
  const tempPassword = crypto.randomBytes(12).toString("base64url");
  const passwordHash = await hashPassword(tempPassword);

  const user = await rawPrisma.user.create({
    data: { orgId: org.id, name: "Yughma Tech Admin", email, passwordHash, mustChangePassword: true },
  });
  await rawPrisma.userRole.create({ data: { userId: user.id, roleId: role.id } });

  console.log(`Seeded platform org "Yughma Tech" (${org.id}).`);
  console.log(`Admin login: ${email}`);
  console.log(`Temporary password: ${tempPassword}`);
  console.log(`(Change this after first login — there is no "change password" screen yet; flag if you need one.)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => rawPrisma.$disconnect());
