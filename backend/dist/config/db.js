import mongoose from 'mongoose';
/**
 * Connect to MongoDB.
 *
 * IMPORTANT — Transactions:
 * MongoDB multi-document transactions require a replica set (or sharded cluster).
 * For local development with a standalone mongod, we fall back to a single-document
 * atomic upsert strategy (see BookingModel unique index + findOneAndUpdate).
 * For production / Atlas, set MONGODB_URI to a replica set URI and transactions
 * work automatically.
 */
export async function connectDB() {
    const uri = process.env.DATABASE_URL;
    if (!uri) {
        throw new Error('MONGODB_URI is not set in environment variables');
    }
    mongoose.set('strictQuery', true);
    mongoose.connection.on('connected', () => {
        console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
    });
    mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
    });
    mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB disconnected');
    });
    await mongoose.connect(uri, {
        // These settings give us predictable behaviour under concurrent load
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    });
}
/**
 * Returns true if the current connection supports multi-document transactions
 * (i.e. we are talking to a replica set or Mongo Atlas).
 */
export async function supportsTransactions() {
    try {
        const admin = mongoose.connection.db?.admin();
        if (!admin)
            return false;
        const status = await admin.command({ isMaster: 1 });
        return !!(status.setName || status.isreplicaset);
    }
    catch {
        return false;
    }
}
export async function disconnectDB() {
    await mongoose.disconnect();
    console.log('MongoDB disconnected cleanly');
}
//
// import mongoose from "mongoose";
// export const connectDB = async () => {
//     try {
//         await mongoose.connect(process.env.DATABASE_URL!);
//         console.log("MongoDB Connected");
//     } catch (error) {
//         console.error(error);
//         process.exit(1);
//     }
// };
