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
  console.log('Seeding menu items...')

  const snacksItems = [
    { name: 'Samosa', price: 18, category: 'Fried' },
    { name: 'Vada Pav', price: 20, category: 'Fried' },
    { name: 'Batata Vada', price: 18, category: 'Fried' },
    { name: 'Kachori', price: 20, category: 'Fried' },
    { name: 'Pudachi Wadi', price: 25, category: 'Fried' },
    { name: 'Misal Pav', price: 55, category: 'Spicy' },
    { name: 'Poha', price: 30, category: 'Breakfast' },
    { name: 'Upma', price: 30, category: 'Breakfast' },
    { name: 'Thepla', price: 20, category: 'Breakfast' },
    { name: 'Pav Bhaji', price: 65, category: 'Main' },
    { name: 'Bhakri Pithla', price: 55, category: 'Main' },
    { name: 'Bread Omelette', price: 40, category: 'Egg' },
    { name: 'Spring Roll', price: 40, category: 'Rolls' },
    { name: 'Pav Bhaji Roll', price: 50, category: 'Rolls' },
    { name: 'Cheese Roll', price: 50, category: 'Rolls' },
    { name: 'Paneer Roll', price: 55, category: 'Rolls' },
    { name: 'Chivda', price: 20, category: 'Snacks' },
    { name: 'Farsan', price: 25, category: 'Snacks' },
  ]

  const teaItems = [
    { name: 'Masala Chai', price: 20, category: 'Tea' },
    { name: 'Cutting Chai', price: 15, category: 'Tea' },
    { name: 'Adrak Chai', price: 20, category: 'Tea' },
    { name: 'Elaichi Chai', price: 20, category: 'Tea' },
    { name: 'Special Chai', price: 25, category: 'Tea' },
    { name: 'Black Tea', price: 15, category: 'Tea' },
    { name: 'Lemon Tea', price: 25, category: 'Tea' },
    { name: 'Green Tea', price: 30, category: 'Tea' },
  ]

  for (const item of snacksItems) {
    await prisma.menuItem.upsert({
      where: { id: `snacks_${item.name.toLowerCase().replace(/\s+/g, '_')}` },
      update: { price: item.price, available: true },
      create: {
        id: `snacks_${item.name.toLowerCase().replace(/\s+/g, '_')}`,
        section: 'snacks',
        name: item.name,
        price: item.price,
        category: item.category,
        available: true,
      },
    })
  }

  for (const item of teaItems) {
    await prisma.menuItem.upsert({
      where: { id: `tea_${item.name.toLowerCase().replace(/\s+/g, '_')}` },
      update: { price: item.price, available: true },
      create: {
        id: `tea_${item.name.toLowerCase().replace(/\s+/g, '_')}`,
        section: 'tea',
        name: item.name,
        price: item.price,
        category: item.category,
        available: true,
      },
    })
  }

  console.log(`Seeded ${snacksItems.length} snacks + ${teaItems.length} tea items`)

  console.log('Seeding staff users...')

  await prisma.user.upsert({
    where: { phone: '9999999999' },
    update: {},
    create: { id: 'user_owner', role: 'owner', name: 'Suresh Patil', phone: '9999999999' },
  })
  await prisma.user.upsert({
    where: { phone: '9999999998' },
    update: {},
    create: { id: 'user_ramesh', role: 'snacks_staff', name: 'Ramesh', phone: '9999999998' },
  })
  await prisma.user.upsert({
    where: { phone: '9999999997' },
    update: {},
    create: { id: 'user_sunita', role: 'tea_staff', name: 'Sunita', phone: '9999999997' },
  })

  console.log('Seeded 3 users (owner, snacks staff, tea staff)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect(); await pool.end() })
