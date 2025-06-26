import mongoose from "mongoose";


const TraceLogSchema = new mongoose.Schema({
  uploaderId: {
    type: String,
    required: true,
  },
  ip: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  otpUsed: {
    type: String,
    required: true,
  },
  accessTime: {
    type: Date,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  fileUrl: {
    type: String,
  },
  publicId: {
    type: String,
    required: true,
  },
  // ✅ Add location field here
  location: {
    country: { type: String },
    city: { type: String },
    region: { type: String },
    timezone: { type: String },
  },
});
console.log('📝 Saved trace log with location:', traceLog.location);

export default mongoose.models.TraceLog || mongoose.model("TraceLog",TraceLogSchema)