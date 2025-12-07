const router = require('express').Router();
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

router.post('/', verifyToken, async (req, res) => {
    const { event_id, quantity, mobile } = req.body;
    const userId = req.user.id; // We get the ID from the token

    try {
        // 1. Fetch User Details (THE MISSING STEP)
        const [userRows] = await db.query('SELECT name, email FROM users WHERE id = ?', [userId]);
        if (userRows.length === 0) return res.status(404).json({ message: "User not found" });
        const user = userRows[0]; // Now we have the real name and email

        // 2. Check Event Availability
        const [event] = await db.query('SELECT available_seats, price, title FROM events WHERE id = ?', [event_id]);
        if (event.length === 0) return res.status(404).json({ message: "Event not found" });

        if (event[0].available_seats < quantity) {
            return res.status(400).json({ message: "Not enough seats available" });
        }

        // 3. Calculate Total Price
        const totalAmount = event[0].price * quantity;

        // 4. Deduct Seats
        await db.query('UPDATE events SET available_seats = available_seats - ? WHERE id = ?', [quantity, event_id]);

        // 5. Save Booking (Using 'user.name' instead of 'req.user.name')
        const [result] = await db.query(
            `INSERT INTO bookings (event_id, user_id, name, email, quantity, mobile, total_amount, event_name)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [event_id, userId, user.name, user.email, quantity, mobile, totalAmount, event[0].title]
        );

        res.json({ message: "Booking Confirmed", bookingId: result.insertId });

    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
});
// CANCEL BOOKING (User or Admin)
router.put('/cancel/:id', verifyToken, async (req, res) => {
    const bookingId = req.params.id;
    const userId = req.user.id;

    try {
        // 1. Find the booking
        const [rows] = await db.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);

        // Debug: Check if we found it
        if (rows.length === 0) {
            return res.status(404).json({ message: "Booking not found" });
        }

        const booking = rows[0];

        // 2. Security Check
        if (booking.user_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access Denied" });
        }

        // 3. Status Check
        if (booking.status === 'cancelled') {
            return res.status(400).json({ message: "Booking is already cancelled" });
        }

        // 4. Update Status (FIX: Used single quotes 'cancelled')
        await db.query("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [bookingId]);

        // 5. Refund Seats (FIX: Ensure event_id and quantity exist)
        if (!booking.event_id || !booking.quantity) {
            throw new Error(`Invalid Booking Data: event_id=${booking.event_id}, quantity=${booking.quantity}`);
        }

        await db.query('UPDATE events SET available_seats = available_seats + ? WHERE id = ?',
            [booking.quantity, booking.event_id]);

        res.json({ message: "Booking cancelled successfully" });

    } catch (err) {
        // THIS IS THE MOST IMPORTANT PART
        console.error("❌ CRITICAL SQL ERROR:", err.message);
        console.error(err);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
});
// GET MY BOOKINGS (Logged-in User)
router.get('/my-bookings', verifyToken, async (req, res) => {
    const userId = req.user.id; // Get ID from the "Badge" (Token)

    try {
        // Fetch bookings + Event details (like Image/Location) for this specific user
        const [rows] = await db.query(`
            SELECT 
                bookings.id as booking_id,
                bookings.quantity,
                bookings.total_amount,
                bookings.status,
                bookings.booking_date,
                events.title,
                events.date as event_date,
                events.location,
                events.img
            FROM bookings 
            JOIN events ON bookings.event_id = events.id 
            WHERE bookings.user_id = ?
            ORDER BY bookings.booking_date DESC
        `, [userId]);

        res.json(rows);
    } catch (err) {
        res.status(500).json(err);
    }
});
// GET ALL BOOKINGS (Admin Only)
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
    try {
        // We join tables to get the Event Title along with the booking
        // This is why SQL is powerful!
        const [rows] = await db.query(`
            SELECT bookings.*, events.title as event_title 
            FROM bookings 
            JOIN events ON bookings.event_id = events.id 
            ORDER BY booking_date DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;