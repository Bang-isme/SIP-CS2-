/**
 * Check MongoDB Alert collection for duplicates
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { MONGODB_URI } from "../src/config.js";
import Alert from "../src/models/Alert.js";

async function main() {
    await mongoose.connect(MONGODB_URI);

    console.log("\n=== All Alerts in MongoDB ===");
    const alerts = await Alert.find().lean();

    alerts.forEach(a => {
        console.log(`  ID: ${a._id}`);
        console.log(`     Type: ${a.type}`);
        console.log(`     Name: ${a.name}`);
        console.log(`     Threshold: ${a.threshold}`);
        console.log(`     Active: ${a.isActive}`);
        console.log("");
    });

    console.log("\n=== Count by Type ===");
    const typeCounts = {};
    alerts.forEach(a => {
        typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
    });

    for (const [type, count] of Object.entries(typeCounts)) {
        if (count > 1) {
            console.log(`  ⚠️ ${type}: ${count} alerts (DUPLICATE!)`);
        } else {
            console.log(`  ✓ ${type}: ${count} alert`);
        }
    }

    await mongoose.disconnect();
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
