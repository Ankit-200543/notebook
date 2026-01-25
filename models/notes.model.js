const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  user: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },lastModified: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Note", noteSchema);
