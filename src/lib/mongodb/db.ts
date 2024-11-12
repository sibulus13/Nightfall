import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env');
}
const clientOptions = { serverApi: { version: '1' as const, strict: true, deprecationErrors: true } };

async function run() {
    try {
        // Create a Mongoose client with a MongoClientOptions object to set the Stable API version
        await mongoose.connect(MONGODB_URI, clientOptions);
        if (mongoose.connection.db) {
            await mongoose.connection.db.admin().command({ ping: 1 });
        } else {
            throw new Error('Database connection is undefined');
        }
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        await mongoose.disconnect();
    }
}

export default run;