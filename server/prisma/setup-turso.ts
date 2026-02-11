import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const statements = [
  `CREATE TABLE IF NOT EXISTS "User" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "email" TEXT NOT NULL, "password" TEXT NOT NULL, "name" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'agent', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS "Venue" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "name" TEXT NOT NULL, "address" TEXT NOT NULL, "description" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS "Floor" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "venueId" INTEGER NOT NULL, "name" TEXT NOT NULL, "level" INTEGER NOT NULL, CONSTRAINT "Floor_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "Section" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "floorId" INTEGER NOT NULL, "name" TEXT NOT NULL, "type" TEXT NOT NULL, CONSTRAINT "Section_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "Seat" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "sectionId" INTEGER NOT NULL, "row" TEXT NOT NULL, "number" INTEGER NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true, CONSTRAINT "Seat_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "Show" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "venueId" INTEGER NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "date" DATETIME NOT NULL, "status" TEXT NOT NULL DEFAULT 'upcoming', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Show_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "TicketCategory" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "showId" INTEGER NOT NULL, "name" TEXT NOT NULL, "price" REAL NOT NULL, "color" TEXT, "description" TEXT, CONSTRAINT "TicketCategory_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "Ticket" ("id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "showId" INTEGER NOT NULL, "seatId" INTEGER NOT NULL, "categoryId" INTEGER NOT NULL, "status" TEXT NOT NULL DEFAULT 'available', "holderName" TEXT, "holderPhone" TEXT, "holderEmail" TEXT, "barcode" TEXT, "reservedById" INTEGER, "soldById" INTEGER, "reservedAt" DATETIME, "soldAt" DATETIME, "checkedInAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "Ticket_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "Ticket_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "Ticket_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TicketCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "Ticket_reservedById_fkey" FOREIGN KEY ("reservedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT "Ticket_soldById_fkey" FOREIGN KEY ("soldById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Seat_sectionId_row_number_key" ON "Seat"("sectionId", "row", "number")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Ticket_barcode_key" ON "Ticket"("barcode")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Ticket_showId_seatId_key" ON "Ticket"("showId", "seatId")`,
];

async function main() {
  console.log('Turso DB tablolar oluşturuluyor...');
  for (const sql of statements) {
    await client.execute(sql);
    const table = sql.match(/"(\w+)"/)?.[1];
    console.log(`  ✓ ${table}`);
  }
  console.log('Tüm tablolar oluşturuldu!');
}

main().catch(console.error);
