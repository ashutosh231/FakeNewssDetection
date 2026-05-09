const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const morgan = require('morgan');

const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const connectDB = require('./config/db');
const { connectRedis, redisClient } = require('./config/redis');

// Load env vars
dotenv.config();

// Connect to Database and Redis
connectDB();
connectRedis();

const app = express();

// CORS must come BEFORE helmet so preflight OPTIONS requests aren't blocked
const allowedOrigins = [
  'http://localhost:5173',
  'https://truthscannai.netlify.app',      // Production Netlify URL
  process.env.CLIENT_URL,                  // Dynamic override via env var
].filter(Boolean);


app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, Postman, Render health checks)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Security headers (configured to not block cross-origin requests)
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Global Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

// Route files
const authRoutes = require('./routes/authRoutes');
const scanRoutes = require('./routes/scanRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/payment', paymentRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('TruthScan AI Backend API is running...');
});

// Error handling Middlewares
app.use(notFound);
app.use(errorHandler);

module.exports = app;
