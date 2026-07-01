import * as dotenv from 'dotenv'
import path from 'node:path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Running safe database seed (non-destructive)...')

  console.log('Seeding deliverable menu items...')
  const snacksItems = [
    { name: 'Vada Pav', price: 20, category: 'Snacks' },
    { name: 'Poha', price: 25, category: 'Snacks' },
    { name: 'Upma', price: 25, category: 'Snacks' },
    { name: 'Shira', price: 30, category: 'Snacks' },
    { name: 'Khichadi', price: 35, category: 'Snacks' },
    { name: 'Udid Vada', price: 35, category: 'Snacks' },
  ]

  for (const item of snacksItems) {
    const id = `snacks_${item.name.toLowerCase().replace(/\s+/g, '_')}`
    await prisma.menuItem.upsert({
      where: { id },
      update: {
        name: item.name,
        price: item.price,
        category: item.category,
      },
      create: {
        id,
        section: 'snacks',
        name: item.name,
        price: item.price,
        category: item.category,
        available: true,
      },
    })
  }
  console.log(`Seeded/Updated ${snacksItems.length} snacks menu items.`)

  console.log('Seeding initial staff users...')
  await prisma.user.upsert({
    where: { id: 'user_owner' },
    update: {
      role: 'owner',
      name: 'Owner',
      phone: '9999999999',
    },
    create: {
      id: 'user_owner',
      role: 'owner',
      name: 'Owner',
      phone: '9999999999',
    },
  })

  await prisma.user.upsert({
    where: { id: 'user_manager' },
    update: {
      role: 'section_manager',
      name: 'Manager',
      phone: '9999999998',
    },
    create: {
      id: 'user_manager',
      role: 'section_manager',
      name: 'Manager',
      phone: '9999999998',
    },
  })
  console.log('Seeded Owner and Manager profiles.')

  console.log('Seeding default shop settings...')
  await prisma.shopSettings.upsert({
    where: { id: 'default' },
    update: {
      shopName: 'Nyahari Snacks Centre',
      upiId: 'paytmqr722wbp@ptys',
      upiMerchantName: 'Paytm',
    },
    create: {
      id: 'default',
      shopName: 'Nyahari Snacks Centre',
      upiId: 'paytmqr722wbp@ptys',
      upiMerchantName: 'Paytm',
    },
  })
  console.log('Seeded default shop settings.')
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
