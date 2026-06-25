import path from 'node:path'
import { defineConfig } from 'prisma/config'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DIRECT_URL!,
  },
  migrate: {
    async adapter() {
      const { PrismaPg } = await import('@prisma/adapter-pg')
      const { Pool } = await import('pg')
      const pool = new Pool({
        connectionString: process.env.DIRECT_URL,
        ssl: { rejectUnauthorized: false },
      })
      return new PrismaPg(pool)
    },
  },
})
