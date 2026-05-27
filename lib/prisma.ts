import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// This is required for @neondatabase/serverless to work in Node.js
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const createPrismaClient = () => {
  let connectionString = process.env.DATABASE_URL?.trim();

  // Sanitize: Remove quotes if they exist
  if (connectionString?.startsWith('"') && connectionString?.endsWith('"')) {
    connectionString = connectionString.substring(1, connectionString.length - 1);
  }
  
  // Sanitize: Remove any internal newlines or spaces that might have been pasted accidentally
  connectionString = connectionString?.replace(/\s/g, '');

  console.log("--- Prisma Diagnostic ---");
  console.log("DATABASE_URL found:", !!connectionString);
  if (connectionString) {
    console.log("DATABASE_URL start:", connectionString.substring(0, 15) + "...");
    console.log("DATABASE_URL length:", connectionString.length);
  }
  console.log("-------------------------");

  if (!connectionString) {
    console.error("Error: DATABASE_URL is not defined in your environment variables.");
    return new PrismaClient();
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool as any);

  return new PrismaClient({
    adapter,
    log: ['query', 'error', 'warn'],
  });
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
