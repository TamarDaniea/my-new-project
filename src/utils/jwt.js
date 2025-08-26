const jwt = require('jsonwebtoken');

function generateToken(user) {
    const result = jwt.sign(
        { userId: user._id, role: user.role, username: user.username },
        process.env.SECRET_KEY,
        { expiresIn: "24h" }
    );
    return result;
}

module.exports = { generateToken };
