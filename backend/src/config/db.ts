import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
    const uri = process.env.DATABASE_URL!;
    if (!uri) {
        throw new Error('MONGODB_URI is not set in environment variables');
    }

    mongoose.set('strictQuery', true);

    mongoose.connection.on('connected', () => {
        console.log(`MongoDB connected: ${mongoose.connection.host}`);
    });

    mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected');
    });

    await mongoose.connect(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    });
}


export async function supportsTransactions(): Promise<boolean> {
    try {
        const admin = mongoose.connection.db?.admin();
        if (!admin) return false;
        const status = await admin.command({ isMaster: 1 });
        return !!(status.setName || status.isreplicaset);
    } catch {
        return false;
    }
}

export async function disconnectDB(): Promise<void> {
    await mongoose.disconnect();
    console.log('MongoDB disconnected cleanly');
}
