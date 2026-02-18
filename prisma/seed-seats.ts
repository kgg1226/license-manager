import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting seat migration...");

  const individualLicenses = await prisma.license.findMany({
    where: { isVolumeLicense: false },
    include: {
      seats: true,
      assignments: {
        where: { returnedDate: null },
        select: { id: true },
      },
    },
  });

  console.log(`Found ${individualLicenses.length} individual licenses`);

  for (const license of individualLicenses) {
    // Skip if seats already exist
    if (license.seats.length > 0) {
      console.log(`  [skip] "${license.name}" — already has ${license.seats.length} seats`);
      continue;
    }

    await prisma.$transaction(async (tx) => {
      let firstSeatId: number | null = null;

      // If existing key, create first seat with that key
      if (license.key) {
        const seat = await tx.licenseSeat.create({
          data: { licenseId: license.id, key: license.key },
        });
        firstSeatId = seat.id;
      }

      // Create remaining empty seats up to totalQuantity
      const existingCount = firstSeatId ? 1 : 0;
      const toCreate = license.totalQuantity - existingCount;
      const emptySeats: number[] = [];

      for (let i = 0; i < toCreate; i++) {
        const seat = await tx.licenseSeat.create({
          data: { licenseId: license.id },
        });
        emptySeats.push(seat.id);
      }

      // Link active assignments to seats (key seat first)
      const seatPool = firstSeatId ? [firstSeatId, ...emptySeats] : emptySeats;
      for (let i = 0; i < license.assignments.length && i < seatPool.length; i++) {
        await tx.assignment.update({
          where: { id: license.assignments[i].id },
          data: { seatId: seatPool[i] },
        });
      }

      console.log(
        `  [done] "${license.name}" — ${existingCount + toCreate} seats created, ` +
        `${Math.min(license.assignments.length, seatPool.length)} assignments linked`
      );
    });
  }

  console.log("Seat migration complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
