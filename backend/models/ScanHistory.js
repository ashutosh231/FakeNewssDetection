const mongoose = require('mongoose');

const scanHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  inputType: {
    type: String,
    enum: ['text', 'image', 'url'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  credibilityScore: {
    type: Number,
    required: true
  },
  riskLevel: {
    type: String,
    required: true
  },
  verdict: {
    type: String,
    required: true
  },
  flags: {
    type: [String],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('ScanHistory', scanHistorySchema);
