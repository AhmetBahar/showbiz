import express from 'express';
import cors from 'cors';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import authRoutes from './routes/auth';
import venueRoutes from './routes/venues';
import showRoutes from './routes/shows';
import ticketRoutes from './routes/tickets';
import reportRoutes from './routes/reports';

function createPrisma(): PrismaClient {
  // Production: Turso kullan
  if (process.env.TURSO_DATABASE_URL) {
    const libsql = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const adapter = new PrismaLibSql(libsql as any);
    return new PrismaClient({ adapter } as any);
  }
  // Development: Lokal SQLite
  return new PrismaClient();
}

export const prisma = createPrisma();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/shows', showRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Production: React build dosyalarını sun
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
});
