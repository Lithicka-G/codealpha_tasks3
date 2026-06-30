const { socketAuth } = require('../middleware/auth');

let io;

const initSocket = (server) => {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.use(socketAuth);

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`User connected: ${socket.user.name} (${userId})`);

    // Join personal room for notifications
    socket.join(`user:${userId}`);

    // Join project rooms
    socket.on('join:project', (projectId) => {
      socket.join(`project:${projectId}`);
      socket.to(`project:${projectId}`).emit('user:joined', {
        user: { _id: userId, name: socket.user.name, avatar: socket.user.avatar }
      });
    });

    socket.on('leave:project', (projectId) => {
      socket.leave(`project:${projectId}`);
      socket.to(`project:${projectId}`).emit('user:left', { userId });
    });

    // Typing indicators on tasks
    socket.on('typing:start', ({ taskId, projectId }) => {
      socket.to(`project:${projectId}`).emit('typing:start', {
        taskId,
        user: { _id: userId, name: socket.user.name }
      });
    });

    socket.on('typing:stop', ({ taskId, projectId }) => {
      socket.to(`project:${projectId}`).emit('typing:stop', { taskId, userId });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.name}`);
    });
  });

  return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };
