/**
 * Setup test user for running API tests
 * Run: node scripts/setup-test-user.js
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { MONGODB_URI } from "../src/config.js";
import User from "../src/models/User.js";
import Role from "../src/models/Role.js";

async function main() {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Create roles if not exist
    const roles = ["user", "moderator", "admin"];
    for (const name of roles) {
        const exists = await Role.findOne({ name });
        if (!exists) {
            await Role.create({ name });
            console.log(`✓ Created role: ${name}`);
        }
    }

    // Create/update test admin user
    const adminRole = await Role.findOne({ name: "admin" });
    const userRole = await Role.findOne({ name: "user" });

    // Delete existing test user to ensure clean password
    await User.deleteOne({ username: "testadmin" });

    const user = new User({
        username: "testadmin",
        email: "test@test.com",
        password: "test123", // Let pre-save hook hash this
        roles: [adminRole._id, userRole._id],
        tokens: []
    });
    await user.save();
    console.log("✓ Created testadmin user with fresh password");

    console.log("\n📋 Test Credentials:");
    console.log("   Username: testadmin");
    console.log("   Password: test123");

    await mongoose.disconnect();
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
