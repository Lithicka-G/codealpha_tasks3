const Task = require('../models/Task');
const Project = require('../models/Project');
const { sendNotification } = require('../socket/notifications');
const { getIO } = require('../socket');

const checkProjectMember = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return { error: 'Project not found', status: 404 };
  const member = project.members.find(m => m.user.toString() === userId.toString());
  if (!member) return { error: 'Access denied', status: 403 };
  return { project, member };
};

exports.createTask = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, columnId, assignees, priority, dueDate, startDate, labels, estimatedHours } = req.body;
    const { error, status, project } = await checkProjectMember(projectId, req.user._id);
    if (error) return res.status(status).json({ success: false, message: error });

    const col = project.columns.find(c => c.id === columnId);
    if (!col) return res.status(400).json({ success: false, message: 'Invalid column' });

    const taskCount = await Task.countDocuments({ project: projectId, columnId });
    const task = await Task.create({
      title, description, project: projectId, columnId,
      order: taskCount, reporter: req.user._id,
      assignees: assignees || [], priority, dueDate, startDate,
      labels: labels || [], estimatedHours
    });

    await task.populate([
      { path: 'assignees', select: 'name email avatar' },
      { path: 'reporter', select: 'name email avatar' }
    ]);

    // Notify assignees
    if (assignees && assignees.length > 0) {
      for (const assigneeId of assignees) {
        if (assigneeId.toString() !== req.user._id.toString()) {
          await sendNotification(assigneeId, {
            type: 'task_assigned',
            message: `${req.user.name} assigned you to "${title}"`,
            link: `/projects/${projectId}?task=${task._id}`,
            from: req.user._id
          });
        }
      }
    }

    // Emit to project room
    getIO()?.to(`project:${projectId}`).emit('task:created', { task });
    res.status(201).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { error, status } = await checkProjectMember(projectId, req.user._id);
    if (error) return res.status(status).json({ success: false, message: error });

    const filter = { project: projectId, isArchived: false };
    if (req.query.assignee) filter.assignees = req.query.assignee;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.columnId) filter.columnId = req.query.columnId;

    const tasks = await Task.find(filter)
      .populate('assignees', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .populate('comments.author', 'name email avatar')
      .sort({ columnId: 1, order: 1 });

    res.json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId)
      .populate('assignees', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .populate('comments.author', 'name email avatar');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    const { error, status } = await checkProjectMember(task.project, req.user._id);
    if (error) return res.status(status).json({ success: false, message: error });
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    const { error, status } = await checkProjectMember(task.project, req.user._id);
    if (error) return res.status(status).json({ success: false, message: error });

    const prevAssignees = task.assignees.map(a => a.toString());
    const allowedFields = ['title', 'description', 'columnId', 'order', 'assignees', 'priority', 'dueDate', 'startDate', 'labels', 'checklist', 'estimatedHours', 'loggedHours'];
    allowedFields.forEach(field => { if (req.body[field] !== undefined) task[field] = req.body[field]; });
    await task.save();

    await task.populate([
      { path: 'assignees', select: 'name email avatar' },
      { path: 'reporter', select: 'name email avatar' },
      { path: 'comments.author', select: 'name email avatar' }
    ]);

    // Notify new assignees
    if (req.body.assignees) {
      const newAssignees = req.body.assignees.filter(a => !prevAssignees.includes(a.toString()));
      for (const assigneeId of newAssignees) {
        if (assigneeId.toString() !== req.user._id.toString()) {
          await sendNotification(assigneeId, {
            type: 'task_assigned',
            message: `${req.user.name} assigned you to "${task.title}"`,
            link: `/projects/${task.project}?task=${task._id}`,
            from: req.user._id
          });
        }
      }
    }

    getIO()?.to(`project:${task.project}`).emit('task:updated', { task });
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.moveTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { columnId, order } = req.body;
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    const { error, status } = await checkProjectMember(task.project, req.user._id);
    if (error) return res.status(status).json({ success: false, message: error });

    task.columnId = columnId;
    task.order = order;
    await task.save();
    await task.populate(['assignees', 'reporter'].map(p => ({ path: p, select: 'name email avatar' })));

    getIO()?.to(`project:${task.project}`).emit('task:moved', { taskId, columnId, order, movedBy: req.user._id });
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    const { error, status } = await checkProjectMember(task.project, req.user._id);
    if (error) return res.status(status).json({ success: false, message: error });
    const projectId = task.project;
    await task.deleteOne();
    getIO()?.to(`project:${projectId}`).emit('task:deleted', { taskId: req.params.taskId });
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ success: false, message: 'Comment content required' });
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    const { error, status } = await checkProjectMember(task.project, req.user._id);
    if (error) return res.status(status).json({ success: false, message: error });

    task.comments.push({ author: req.user._id, content });
    await task.save();
    await task.populate('comments.author', 'name email avatar');

    const newComment = task.comments[task.comments.length - 1];

    // Notify task reporter and assignees
    const toNotify = [...task.assignees.map(a => a.toString()), task.reporter.toString()]
      .filter((id, i, arr) => arr.indexOf(id) === i && id !== req.user._id.toString());

    for (const userId of toNotify) {
      await sendNotification(userId, {
        type: 'comment_added',
        message: `${req.user.name} commented on "${task.title}"`,
        link: `/projects/${task.project}?task=${task._id}`,
        from: req.user._id
      });
    }

    getIO()?.to(`project:${task.project}`).emit('comment:added', { taskId: task._id, comment: newComment });
    res.status(201).json({ success: true, comment: newComment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateComment = async (req, res) => {
  try {
    const { content } = req.body;
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    const comment = task.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the author can edit this comment' });
    }
    comment.content = content;
    comment.edited = true;
    await task.save();
    await task.populate('comments.author', 'name email avatar');
    const updatedComment = task.comments.id(req.params.commentId);
    getIO()?.to(`project:${task.project}`).emit('comment:updated', { taskId: task._id, comment: updatedComment });
    res.json({ success: true, comment: updatedComment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    const comment = task.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the author can delete this comment' });
    }
    comment.deleteOne();
    await task.save();
    getIO()?.to(`project:${task.project}`).emit('comment:deleted', { taskId: task._id, commentId: req.params.commentId });
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
