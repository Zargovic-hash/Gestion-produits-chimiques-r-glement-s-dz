const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const canevasRoutes = require('./routes/canevas.routes');
const autorisationRoutes = require('./routes/autorisation.routes');
const achatRoutes = require('./routes/achat.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const notificationRoutes = require('./routes/notification.routes');
const reportRoutes = require('./routes/report.routes');
const auditRoutes = require('./routes/audit.routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/canevas', canevasRoutes);
app.use('/api/autorisations', autorisationRoutes);
app.use('/api/achats', achatRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route non trouvée' });
});

app.use(errorHandler);

module.exports = app;
