import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pg from 'pg';
import authRoutes from './routes/auth.js';
import pdfRoutes from './routes/pdf.js';
import { startEmailWorker } from './services/emailWorker.js';

const app = express();
const PORT = process.env.MICRO_PORT || 3001;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGINS?.split(',') || '*' }));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ service: 'ADN Motors Microservice', version: '1.0.0' });
});

app.use('/auth', authRoutes);
app.use('/facturas', pdfRoutes);

// Iniciar worker de emails en background
startEmailWorker().catch(console.error);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Microservicio corriendo en http://0.0.0.0:${PORT}`);
});
