'use strict';

const express = require('express');
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const monitorsRouter = require('./routes/monitors');
const testJobRouter = require('./routes/test-job');
const checksRouter = require('./routes/checks');
const metricsRouter = require('./routes/metrics');
const { globalLimiter } = require('./middleware/rate-limit');

const app = express();

app.use(express.json());

// Global rate limiter: 100 requests per 15 minutes per IP
app.use(globalLimiter);

app.use('/', healthRouter);
app.use('/', authRouter);
app.use('/', monitorsRouter);
app.use('/', testJobRouter);
app.use('/', checksRouter);
app.use('/', metricsRouter);

module.exports = app;
