import { getDb } from "./index";
import { user, account } from "./better-auth-schema";
import { eq } from "drizzle-orm";

/**
 * Seed the database with development data
 * This script can be used to populate the database with test data
 */
async function seed() {
  try {
    if (process.env.NODE_ENV !== "development") {
      throw new Error("Seed can only run in development environment");
    }

    console.log("🌱 Seeding database...");

    await getDb().transaction(async (tx) => {
      // Check if user already exists
      const existingUser = await tx
        .select()
        .from(user)
        .where(eq(user.githubId, "12345"))
        .limit(1);

      if (existingUser.length > 0) {
        console.log("⚠️  Test user already exists, skipping...");
        return;
      }

      // Create a test user
      const [insertedUser] = await tx
        .insert(user)
        .values({
          id: crypto.randomUUID(),
          githubId: "12345",
          login: "testuser",
          name: "Test User",
          email: "test@example.com",
          avatarUrl: "https://avatars.githubusercontent.com/u/12345?v=4",
        })
        .returning();

      // Create a corresponding account record
      await tx.insert(account).values({
        id: crypto.randomUUID(),
        userId: insertedUser.id,
        accountId: "12345",
        providerId: "github",
        accessTokenEncrypted:
          process.env.GITHUB_TEST_TOKEN || "fake_token_not_valid",
        scope: "read:user,user:email,repo",
      });

      console.log("✅ Database seeded successfully!");
      console.log("Test user created:", insertedUser.login);
    });
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

/**
 * Clear all data from the database
 * Use with caution - this will delete all data!
 */
async function clearData() {
  try {
    if (process.env.NODE_ENV !== "development") {
      throw new Error("ClearData can only run in development environment");
    }

    console.log("🗑️  Clearing database...");

    await getDb().transaction(async (tx) => {
      // Clear in reverse order due to foreign key constraints
      await tx.delete(account);
      await tx.delete(user);
    });

    console.log("✅ Database cleared successfully!");
  } catch (error) {
    console.error("❌ Error clearing database:", error);
    throw error;
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  const shouldClear = process.argv.includes("--clear");

  (shouldClear ? clearData().then(() => seed()) : seed())
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seed, clearData };
