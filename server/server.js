require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const centreRoutes = require('./routes/centreRoutes');
const app = express();
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const procurementRoutes = require('./routes/procurementRoutes');
// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.get('/api/test', (req, res) => res.send('test works'));
// Test route
app.get('/', (req, res) => {
  res.send('Kisan Dwar API is running');
});
app.use('/api/centre', centreRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/procurement', procurementRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

