import { getDb } from "@/lib/db";
import { user } from "@/lib/db/better-auth-schema";

/**
 * Test database connection and basic operations
 * This script validates that the database configuration is working properly
 */
async function testConnection() {
  try {
    console.log("🔌 Testing database connection...");

    // Test 1: Basic connection test
    console.log("1. Testing basic connection...");
    await getDb().execute("SELECT 1 as test");
    console.log("   ✅ Connection successful");

    // Test 2: Check if tables exist
    console.log("2. Checking if tables exist...");
    const result = await getDb().execute(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('user', 'session', 'account', 'verification')
    `);
    console.log(
      "   ✅ Found tables:",
      result.map((row: any) => row.table_name),
    );

    // Test 3: Test schema with a simple select
    console.log("3. Testing schema access...");
    await getDb().select().from(user).limit(0);
    console.log("   ✅ Schema access successful");

    console.log("🎉 All database tests passed!");
    console.log("✅ Database is properly configured and accessible");

    return true;
  } catch (error) {
    console.error("❌ Database connection test failed:");

    if (error instanceof Error) {
      if (error.message.includes("ECONNREFUSED")) {
        console.error(
          "   🔌 Connection refused - check if database is running",
        );
        console.error("   💡 Make sure DATABASE_URL is set correctly");
      } else if (error.message.includes("does not exist")) {
        console.error(
          "   🗄️  Database or tables don't exist - run migrations first",
        );
        console.error("   💡 Try running: pnpm db:push");
      } else {
        console.error("   📋 Error details:", error.message);
      }
    } else {
      console.error("   📋 Unknown error:", error);
    }

    return false;
  }
}

/**
 * Test with environment variable validation
 */
async function testWithValidation() {
  console.log("🧪 Database Connection Test\n");

  // Check environment variables
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is not set");
    console.log(
      "💡 Create a .env file with your PostgreSQL connection string:",
    );
    console.log(
      "   DATABASE_URL=postgresql://username:password@host:port/database",
    );
    console.log(
      "   Example: DATABASE_URL=postgresql://postgres:password@localhost:5432/changelog_db",
    );
    return false;
  }

  console.log("✅ DATABASE_URL is set");
  console.log("");

  return await testConnection();
}

// Run test if this file is executed directly
if (require.main === module) {
  testWithValidation()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("💥 Unexpected error:", error);
      process.exit(1);
    });
}

export { testConnection, testWithValidation };
