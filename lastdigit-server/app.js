require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');

// ── Route Imports ─────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const singaporeRoutes = require('./routes/singapore');
const dearRoutes = require('./routes/dear');
const externalRoutes = require('./routes/external');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
const defaultOrigins = [
  'https://lastdigitlotto.in',
  'https://www.lastdigitlotto.in',
  'https://api.lastdigitlotto.in',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:4173',
  'capacitor://localhost',
  'http://localhost',
];

const envOrigins = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server) where origin is undefined
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes(origin) ||
      /^https?:\/\/([a-zA-Z0-9-]+\.)?lastdigitlotto\.in(:\d+)?$/.test(origin);

    if (isAllowed) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-admin-key',
    'X-Admin-Key',
    'Accept',
    'Origin',
    'X-Requested-With',
  ],
  exposedHeaders: ['Content-Disposition'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static: serve uploaded images (with CORS enabled for canvas/crossOrigin) ──
app.use('/uploads', cors(corsOptions), express.static(path.join(__dirname, 'uploads')));

// ── Health check ──────────────────────────────────────────────────────────────
const healthCheckHandler = async (_req, res) => {
  try {
    await sequelize.authenticate();
    return res.status(200).json({
      status: 'OK',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: 'connected',
      message: 'LastDigit API is healthy 🚀',
    });
  } catch (err) {
    return res.status(503).json({
      status: 'ERROR',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: err.message,
    });
  }
};

app.get('/', (_req, res) => res.json({ success: true, message: 'LastDigit API is running 🚀' }));
app.get('/health', healthCheckHandler);
app.get('/api/health', healthCheckHandler);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/singapore', singaporeRoutes);
app.use('/api/dear', dearRoutes);
app.use('/api/external', externalRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found.' }));

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error.' });
});

// ── Database Sync + Start ──────────────────────────────────────────────────────
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅  MySQL connected via Sequelize.');

    // alter: true — safe sync, keeps existing data
    await sequelize.sync({ alter: true });
    console.log('✅  Database synced (tables created/updated).');

    app.listen(PORT, () => {
      console.log(`🚀  Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌  Unable to connect to the database:', err.message);
    process.exit(1);
  }
})();

