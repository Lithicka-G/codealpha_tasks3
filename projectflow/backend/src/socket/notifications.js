const User = require('../models/User');
const { getIO } = require('../socket');

const sendNotification = async (userId, notification) => {
  try {
    await User.findByIdAndUpdate(userId, {
      $push: { notifications: notification }
    });
    // Emit real-time notification
    getIO()?.to(`user:${userId}`).emit('notification', notification);
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

module.exports = { sendNotification };
