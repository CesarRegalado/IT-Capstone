import express from 'express';
import { PrismaClient} from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Health check tests DB + API
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1 as ok`;
    res.json({ ok: true, service: 'attendance-tracker-api' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

// Example route
app.get('/students', async (_req, res) => {
  const students = await prisma.student.findMany();
  res.json(students);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));