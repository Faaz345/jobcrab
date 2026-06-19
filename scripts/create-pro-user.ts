import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// We can use the service role key if available, otherwise anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const email = "pro_test@jobcrab.com";
  const password = "password123";

  console.log(`Creating or fetching test user: ${email}...`);

  // Try to sign up
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name: "Pro Tester" },
    },
  });

  let userId = signUpData?.user?.id;

  // If already registered, sign in to get the UUID
  if (!userId || (signUpError && signUpError.message.includes("already registered"))) {
    console.log("User already exists in Auth, signing in to get ID...");
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      console.error("Failed to sign in existing user:", signInError.message);
      process.exit(1);
    }
    userId = signInData?.user?.id;
  }

  if (!userId) {
    console.error("Could not obtain user ID:", signUpError);
    process.exit(1);
  }

  console.log(`User ID: ${userId}`);
  console.log("Upserting user to Prisma database with PRO access and crab avatar...");

  await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email,
      name: "Pro Tester",
      tier: "pro",
      avatarUrl: "/images/crab-only.png",
      isOnboarded: true,
    },
    update: {
      tier: "pro",
      avatarUrl: "/images/crab-only.png",
      isOnboarded: true,
    },
  });

  console.log("✅ Success! Pro test user is ready.");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
