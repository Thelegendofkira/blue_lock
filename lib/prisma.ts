// lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const prismaClientSingleton = () => {
  // 1. Initialize the native Postgres Pool
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  
  // 2. Wrap it in the Prisma Adapter
  const adapter = new PrismaPg(pool);
  
  // 3. Pass the adapter to the PrismaClient (The Prisma 7 way)
  return new PrismaClient({ adapter });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;