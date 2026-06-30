const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  createTask, getTasks, getTask, updateTask, moveTask, deleteTask,
  addComment, updateComment, deleteComment
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getTasks).post(createTask);
router.route('/:taskId').get(getTask).put(updateTask).delete(deleteTask);
router.put('/:taskId/move', moveTask);
router.route('/:taskId/comments').post(addComment);
router.route('/:taskId/comments/:commentId').put(updateComment).delete(deleteComment);

module.exports = router;
