const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

// Import routes
const uploadRoutes = require('./src/routes/uploadRoutes');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api', uploadRoutes);

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Formula 4 Analytics Server running on port ${port}`);
}); 