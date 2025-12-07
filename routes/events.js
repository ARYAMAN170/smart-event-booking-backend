const router = require('express').Router();
const db = require('../config/db');
const upload = require('../config/cloudinary'); // Image uploader
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// GET ALL EVENTS (With Search & Filter)
router.get('/', async (req, res) => {
    const { location, date } = req.query;
    let query = 'SELECT * FROM events WHERE 1=1';
    const params = [];

    if (location) {
        query += ' AND location LIKE ?';
        params.push(`%${location}%`);
    }
    if (date) {
        query += ' AND date = ?';
        params.push(date);
    }

    try {
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json(err);
    }
});

// CREATE EVENT (Admin Only + Image Upload)
// Note: 'img' matches the name attribute in your frontend form
router.post('/', verifyToken, verifyAdmin, upload.single('img'), async (req, res) => {
    const { title, description, location, date, total_seats, price } = req.body;
    const imgUrl = req.file ? req.file.path : null; // Cloudinary URL

    try {
        await db.query(
            `INSERT INTO events (title, description, location, date, total_seats, available_seats, price, img) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, location, date, total_seats, total_seats, price, imgUrl]
        );
        res.status(201).json({ message: "Event Created Successfully" });
    } catch (err) {
        res.status(500).json(err);
    }
});
// UPDATE EVENT (Admin Only)
router.put('/:id', verifyToken, verifyAdmin, upload.single('img'), async (req, res) => {
    const eventId = req.params.id;
    // We access the text fields
    const { title, description, location, date, total_seats, price } = req.body;

    try {
        // 1. Get the current event data first
        const [oldEvent] = await db.query('SELECT * FROM events WHERE id = ?', [eventId]);
        if (oldEvent.length === 0) return res.status(404).json({ message: "Event not found" });

        // 2. Decide which Image URL to use
        // If a new file was uploaded, use it. Otherwise, keep the old one.
        const imgUrl = req.file ? req.file.path : oldEvent[0].img;

        // 3. Update the Database
        await db.query(
            `UPDATE events SET 
                title = ?, 
                description = ?, 
                location = ?, 
                date = ?, 
                total_seats = ?, 
                price = ?, 
                img = ? 
             WHERE id = ?`,
            [title, description, location, date, total_seats, price, imgUrl, eventId]
        );

        res.json({ message: "Event updated successfully" });

    } catch (err) {
        res.status(500).json(err);
    }
});
// DELETE EVENT (Admin Only)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
    const eventId = req.params.id;

    try {
        // 1. Check if event exists
        const [event] = await db.query('SELECT * FROM events WHERE id = ?', [eventId]);
        if (event.length === 0) return res.status(404).json({ message: "Event not found" });

        // 2. Delete the event
        // Note: If this event has bookings, you might need to delete those bookings first
        // or set ON DELETE CASCADE in your database.
        // For now, we will try to delete the event directly.
        await db.query('DELETE FROM events WHERE id = ?', [eventId]);

        res.json({ message: "Event deleted successfully" });
    } catch (err) {
        // This catches Foreign Key errors (e.g., if you try to delete an event that people have already booked)
        res.status(500).json({ message: "Cannot delete event (It might have active bookings)", error: err });
    }
});
module.exports = router;