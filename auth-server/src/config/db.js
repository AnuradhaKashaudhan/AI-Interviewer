import mongoose from 'mongoose';

export const connectDatabase = async (mongoUri) => {
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required.');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await mongoose.connect(mongoUri);
  return mongoose.connection;
};