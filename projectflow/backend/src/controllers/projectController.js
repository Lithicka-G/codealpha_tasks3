const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { sendNotification } = require('../socket/notifications');

exports.createProject = async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;
    const project = await Project.create({ name, description, color, icon, owner: req.user._id });
    await project.populate('members.user', 'name email avatar');
    res.status(201).json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      'members.user': req.user._id,
      isArchived: false
    }).populate('members.user', 'name email avatar').populate('owner', 'name email avatar').sort('-updatedAt');
    res.json({ success: true, projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('members.user', 'name email avatar')
      .populate('owner', 'name email avatar');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const isMember = project.members.some(m => m.user._id.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied' });
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const member = project.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || member.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can update the project' });
    }
    const { name, description, color, icon, columns } = req.body;
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (color) project.color = color;
    if (icon) project.icon = icon;
    if (columns) project.columns = columns;
    await project.save();
    await project.populate('members.user', 'name email avatar');
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the owner can delete the project' });
    }
    await Task.deleteMany({ project: project._id });
    await project.deleteOne();
    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.inviteMember = async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const adminMember = project.members.find(m => m.user.toString() === req.user._id.toString());
    if (!adminMember || adminMember.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can invite members' });
    }
    const userToInvite = await User.findOne({ email });
    if (!userToInvite) return res.status(404).json({ success: false, message: 'User not found' });
    const alreadyMember = project.members.some(m => m.user.toString() === userToInvite._id.toString());
    if (alreadyMember) return res.status(400).json({ success: false, message: 'User is already a member' });
    project.members.push({ user: userToInvite._id, role });
    await project.save();
    // Send notification
    await sendNotification(userToInvite._id, {
      type: 'project_invite',
      message: `${req.user.name} invited you to join "${project.name}"`,
      link: `/projects/${project._id}`,
      from: req.user._id
    });
    await project.populate('members.user', 'name email avatar');
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const { userId } = req.params;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const adminMember = project.members.find(m => m.user.toString() === req.user._id.toString());
    if (!adminMember || adminMember.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can remove members' });
    }
    if (project.owner.toString() === userId) {
      return res.status(400).json({ success: false, message: 'Cannot remove the project owner' });
    }
    project.members = project.members.filter(m => m.user.toString() !== userId);
    await project.save();
    await project.populate('members.user', 'name email avatar');
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProjectStats = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    const tasks = await Task.find({ project: req.params.id, isArchived: false });
    const stats = {
      total: tasks.length,
      byColumn: {},
      byPriority: { low: 0, medium: 0, high: 0, critical: 0 },
      overdue: 0,
      completedThisWeek: 0
    };
    const doneColumn = project.columns.find(c => c.title.toLowerCase() === 'done');
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    tasks.forEach(task => {
      stats.byColumn[task.columnId] = (stats.byColumn[task.columnId] || 0) + 1;
      stats.byPriority[task.priority]++;
      if (task.dueDate && new Date(task.dueDate) < new Date() && task.columnId !== doneColumn?.id) stats.overdue++;
      if (doneColumn && task.columnId === doneColumn.id && task.updatedAt > oneWeekAgo) stats.completedThisWeek++;
    });
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
