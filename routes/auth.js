const router = require('express').Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTER
router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;

    // Hash the password (encrypt it)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
        await db.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, role || 'user'] // Default to 'user'
        );
        res.status(201).json({ message: "User Created" });
    } catch (err) {
        res.status(500).json(err);
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // 1. Check if user exists
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(400).json({ message: "User not found" });

    const user = users[0];

    // 2. Check Password
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ message: "Invalid Password" });

    // 3. Create Token (The "Badge")
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);

    // Send back token AND role
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
});

module.exports = router;