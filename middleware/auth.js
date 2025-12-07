const jwt = require('jsonwebtoken');

// 1. Verify User is Logged In
const verifyToken = (req, res, next) => {
    let token = req.header('Authorization');

    if (!token) return res.status(401).json({ message: "Access Denied" });

    // --- THE FIX: Remove "Bearer " if it exists ---
    if (token.startsWith('Bearer ')) {
        token = token.slice(7, token.length).trimLeft();
    }
    // ----------------------------------------------

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ message: "Invalid Token" });
    }
};

// 2. Verify User is Admin
const verifyAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: "Access Denied: Admins Only" });
    }
    next();
};

module.exports = { verifyToken, verifyAdmin };