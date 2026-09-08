const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { ensureBucket } = require('./config/minio');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(morgan('combined'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/standards', require('./routes/standards'));
app.use('/api/hazards', require('./routes/hazards'));
app.use('/api/samples', require('./routes/samples'));
app.use('/api/models', require('./routes/models'));
app.use('/api/prompts', require('./routes/prompts'));
app.use('/api/inference', require('./routes/inference'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/rag', require('./routes/rag'));
app.use('/api/export', require('./routes/export'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/app', require('./routes/app'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

// Initialize MinIO bucket
ensureBucket().catch(console.error);

app.listen(PORT, () => {
  console.log(`AI Safety Admin Server running on port ${PORT}`);
});
