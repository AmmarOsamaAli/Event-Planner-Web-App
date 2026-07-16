const mongoose = require("mongoose");

const participationRequestSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    trim: true,
    maxLength: 500,
  },
  status: {
    type: String,
    required: true,
    default: "pending",
    enum: ["accepted", "declined", "waitlisted", "pending"]
  },
  type: {
    type: String,
    required: true,
    enum: ["invitation", "attendanceRequest"]
  },
  participant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  }
}, {timestamps: true});

const ParticipationRequest = mongoose.model("ParticipationRequest", participationRequestSchema);

module.exports = ParticipationRequest;
