import mongoose from 'mongoose';

interface IApiKey extends mongoose.Document {
  uuid: string;
  apiKey: string;
  createdAt: Date;
}

const apiKeySchema = new mongoose.Schema({
  uuid: {
    type: String,
    required: true,
    unique: true
  },
  apiKey: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model<IApiKey>('ApiKey', apiKeySchema);