import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Admin kullanıcı oluştur
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@showbiz.com' },
    update: {},
    create: {
      email: 'admin@showbiz.com',
      password: adminPassword,
      name: 'Yönetici',
      role: 'admin',
    },
  });

  // Agent kullanıcı oluştur
  const agentPassword = await bcrypt.hash('agent123', 10);
  const agent = await prisma.user.upsert({
    where: { email: 'agent@showbiz.com' },
    update: {},
    create: {
      email: 'agent@showbiz.com',
      password: agentPassword,
      name: 'Gişe Görevlisi',
      role: 'agent',
    },
  });

  // Kapıcı kullanıcı oluştur
  const usherPassword = await bcrypt.hash('usher123', 10);
  await prisma.user.upsert({
    where: { email: 'usher@showbiz.com' },
    update: {},
    create: {
      email: 'usher@showbiz.com',
      password: usherPassword,
      name: 'Kapı Görevlisi',
      role: 'usher',
    },
  });

  console.log('Kullanıcılar oluşturuldu');
  console.log('  Admin: admin@showbiz.com / admin123');
  console.log('  Agent: agent@showbiz.com / agent123');
  console.log('  Usher: usher@showbiz.com / usher123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
