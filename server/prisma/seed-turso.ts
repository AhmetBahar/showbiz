import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function main() {
  const users = [
    { email: 'admin@showbiz.com', password: 'admin123', name: 'Yönetici', role: 'admin' },
    { email: 'agent@showbiz.com', password: 'agent123', name: 'Gişe Görevlisi', role: 'agent' },
    { email: 'usher@showbiz.com', password: 'usher123', name: 'Kapı Görevlisi', role: 'usher' },
  ];

  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 10);
    await client.execute({
      sql: `INSERT OR IGNORE INTO "User" (email, password, name, role, createdAt) VALUES (?, ?, ?, ?, datetime('now'))`,
      args: [u.email, hashed, u.name, u.role],
    });
    console.log(`  ✓ ${u.role}: ${u.email} / ${u.password}`);
  }

  console.log('\nKullanıcılar oluşturuldu!');
}

main().catch(console.error);
