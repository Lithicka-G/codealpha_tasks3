const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  color: {
    type: String,
    default: '#6366f1'
  },
  icon: {
    type: String,
    default: '📋'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'member', 'viewer'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  columns: [{
    id: { type: String, required: true },
    title: { type: String, required: true },
    order: { type: Number, default: 0 },
    color: { type: String, default: '#e2e8f0' }
  }],
  isArchived: { type: Boolean, default: false }
}, { timestamps: true });

// Auto-add owner as admin member
projectSchema.pre('save', function(next) {
  if (this.isNew) {
    const ownerExists = this.members.some(m => m.user.toString() === this.owner.toString());
    if (!ownerExists) {
      this.members.push({ user: this.owner, role: 'admin' });
    }
    if (this.columns.length === 0) {
      this.columns = [
        { id: 'col-1', title: 'To Do', order: 0, color: '#e2e8f0' },
        { id: 'col-2', title: 'In Progress', order: 1, color: '#dbeafe' },
        { id: 'col-3', title: 'In Review', order: 2, color: '#fef3c7' },
        { id: 'col-4', title: 'Done', order: 3, color: '#dcfce7' }
      ];
    }
  }
  next();
});

module.exports = mongoose.model('Project', projectSchema);
