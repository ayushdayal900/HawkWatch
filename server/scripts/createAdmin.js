/**
 * scripts/createAdmin.js
 * ─────────────────────────────────────────────────────
 * One-shot script to seed an admin account in MongoDB.
 *
 * Usage (from the /server directory):
 *   node scripts/createAdmin.js
 *
 * The password is hashed by the User model's pre-save hook.
 * ─────────────────────────────────────────────────────
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('../models/User');

const ADMIN = {
    name:     'HawkWatch Admin',
    email:    'admin@hawkwatch.app',
    password: 'Admin@1234',
    role:     'admin',
};

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅  Connected to MongoDB');

    const existing = await User.findOne({ email: ADMIN.email });
    if (existing) {
        console.log(`ℹ️   Admin already exists: ${ADMIN.email}`);
        process.exit(0);
    }

    await User.create(ADMIN);
    console.log('🎉  Admin account created!');
    console.log(`    Email   : ${ADMIN.email}`);
    console.log(`    Password: ${ADMIN.password}`);
    process.exit(0);
}

main().catch((err) => {
    console.error('❌  Error:', err.message);
    process.exit(1);
});
