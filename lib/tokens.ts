import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/** The next per-day token number for a business date (1-based, gap-free). */
export async function peekNextTokenNumber(date: string): Promise<number> {
  const last = await prisma.token.findFirst({
    where: { date },
    orderBy: { tokenNumber: "desc" },
    select: { tokenNumber: true },
  });
  return (last?.tokenNumber ?? 0) + 1;
}

/**
 * Allocate the next token number for `date` and run `create` with it, retrying on
 * the unique [date, tokenNumber] collision that happens when two orders are placed
 * at the same instant (counter + customer QR). The full create is re-attempted with
 * a fresh number, so token numbers stay unique and sequential under concurrency.
 */
export async function createWithToken<T>(
  date: string,
  create: (tokenNumber: number) => Promise<T>,
  maxAttempts = 8,
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const tokenNumber = await peekNextTokenNumber(date);
    try {
      return await create(tokenNumber);
    } catch (e) {
      const isUniqueClash =
        e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
      if (isUniqueClash && attempt < maxAttempts - 1) continue;
      throw e;
    }
  }
  throw new Error("Unable to allocate a token number after multiple attempts");
}
