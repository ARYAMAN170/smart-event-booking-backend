const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

// Middleware
app.use(cors()); // Allow Frontend to talk to Backend
app.use(express.json()); // Parse JSON bodies

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/bookings', require('./routes/bookings'));

// --- HEALTH CHECK ROUTE ---
app.get('/', (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "Server is running smoothly!",
        timestamp: new Date()
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));