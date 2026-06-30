import * as dotenv from 'dotenv';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.DIRECT_URL) {
  console.error("Missing credentials in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const pool = new Pool({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== STARTING CLEANUP ===");

  // 1. Clear order-related tables in correct dependency order
  console.log("Cleaning orders, tokens, payments, tea history...");
  
  const deletedOrderItems = await prisma.orderItem.deleteMany({});
  console.log(`Deleted ${deletedOrderItems.count} OrderItems.`);

  const deletedTokens = await prisma.token.deleteMany({});
  console.log(`Deleted ${deletedTokens.count} Tokens.`);

  const deletedPayments = await prisma.payment.deleteMany({});
  console.log(`Deleted ${deletedPayments.count} Payments.`);

  const deletedOrders = await prisma.order.deleteMany({});
  console.log(`Deleted ${deletedOrders.count} Orders.`);

  const deletedTeaEntries = await prisma.teaQuickEntry.deleteMany({});
  console.log(`Deleted ${deletedTeaEntries.count} TeaQuickEntries.`);

  const deletedUsers = await prisma.user.deleteMany({});
  console.log(`Deleted ${deletedUsers.count} local users.`);

  // 2. Auth Users clean-up and creation
  console.log("Managing Supabase Auth users...");

  const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    perPage: 1000
  });

  if (listError) {
    console.error("Failed to list Supabase users:", listError);
    process.exit(1);
  }

  const domainsToFlush = ["@abhinandan.in", "@nyahari.in"];
  for (const user of usersData.users) {
    if (user.email && domainsToFlush.some(domain => user.email.endsWith(domain))) {
      console.log(`Deleting old user: ${user.email} (${user.id})...`);
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (deleteError) {
        console.error(`Failed to delete user ${user.email}:`, deleteError);
      }
    }
  }

  const NEW_USERS = [
    { username: "Owner", email: "owner@abhinandan.in", password: "Owner@908", role: "owner", name: "Owner" },
    { username: "Manager", email: "manager@abhinandan.in", password: "Manager@908", role: "section_manager", name: "Manager" },
    { username: "Snacks", email: "snacks@abhinandan.in", password: "Snacks@908", role: "snacks_staff", name: "Snacks Staff" },
    { username: "Tea", email: "tea@abhinandan.in", password: "Tea@908", role: "tea_staff", name: "Tea Staff" },
  ];

  for (const nu of NEW_USERS) {
    console.log(`Creating auth user: ${nu.email} with password: ${nu.password}...`);
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: nu.email,
      password: nu.password,
      email_confirm: true,
      user_metadata: { role: nu.role }
    });

    if (createError) {
      console.error(`Failed to create user ${nu.email}:`, createError);
      continue;
    }

    const authUser = createData.user;
    console.log(`Auth user created successfully: ${nu.email} (id: ${authUser.id}). Local database sync...`);

    // Synced with user table
    await prisma.user.create({
      data: {
        id: `user_${nu.username.toLowerCase()}`,
        role: nu.role,
        name: nu.name,
        supabaseId: authUser.id
      }
    });
  }

  console.log("=== CLEANUP & INITIALIZATION COMPLETED SUCCESSFULLY ===");
}

main()
  .catch((e) => {
    console.error("Error during script execution:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
