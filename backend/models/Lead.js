const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  text: { type: String, required: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, default: Date.now }
});

const leadSchema = new mongoose.Schema({
  customer_name: { type: String, required: true },
  contact_info: { type: String, required: true }, // email or phone
  property_interest: { type: String },
  status: { 
    type: String, 
    enum: ['New', 'Contacted', 'Site Visited', 'Negotiation', 'Payment Done', 'Closed / Converted'],
    default: 'New'
  },
  assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: [noteSchema],
  source: { type: String, default: 'Website' }
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);
