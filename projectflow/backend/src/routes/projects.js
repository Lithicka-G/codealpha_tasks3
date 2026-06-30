const express = require('express');
const router = express.Router();
const {
  createProject, getProjects, getProject, updateProject, deleteProject,
  inviteMember, removeMember, getProjectStats
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getProjects).post(createProject);
router.route('/:id').get(getProject).put(updateProject).delete(deleteProject);
router.post('/:id/invite', inviteMember);
router.delete('/:id/members/:userId', removeMember);
router.get('/:id/stats', getProjectStats);

module.exports = router;
