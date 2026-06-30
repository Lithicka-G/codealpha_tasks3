# ⚡ ProjectFlow — Collaborative Project Management Tool

A full-featured Trello/Asana-like project management app built with the MERN stack + Socket.io for real-time collaboration.

---

## 🚀 Features

### Core
- 🔐 **JWT Auth** — Register, login, secure protected routes
- 🗂️ **Project Boards** — Create unlimited projects with custom colors & icons
- 📋 **Kanban Board** — Drag-and-drop tasks across columns (To Do → In Progress → In Review → Done)
- ✅ **Task Management** — Title, description, priority, due dates, checklists, labels
- 👥 **Team Collaboration** — Invite members by email, assign roles (admin/member/viewer)
- 💬 **Task Comments** — Real-time threaded comments with edit/delete
- 🔔 **Notifications** — In-app notification system with unread badges
- 📊 **Dashboard** — Overview of all projects, tasks, and stats

### Real-Time (WebSockets)
- Live task creation, updates, moves, deletions
- Live comment posting
- Online user presence indicators
- Real-time notification delivery

### Bonus
- 🎯 Priority labels (Low / Medium / High / Critical)
- 📅 Due date tracking with overdue indicators
- ✅ Checklist items with progress bar
- 🔍 User search for invites
- 📱 Responsive design

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6 |
| Drag & Drop | @hello-pangea/dnd |
| Real-time | Socket.io Client |
| HTTP Client | Axios |
| Backend | Node.js, Express.js |
| WebSockets | Socket.io |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Containerization | Docker + Docker Compose |

---

## ⚡ Quick Start

### Option 1: Docker (Recommended — one command)

```bash
# Clone / extract the project
cd projectflow

# Start everything
docker compose up --build

# Open in browser
open http://localhost:3000
```

That's it! MongoDB, backend (port 5000), and frontend (port 3000) all start automatically.

---

### Option 2: Manual Setup

#### Prerequisites
- Node.js 18+
- MongoDB running locally on port 27017

#### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your settings (JWT_SECRET at minimum)

# Start dev server
npm run dev
# or production:
npm start
```

#### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Create .env file
cp .env.example .env
# Edit if backend is not on localhost:5000

# Start dev server
npm start
```

#### 3. Open the app
Navigate to `http://localhost:3000`

---

## 📁 Project Structure

```
projectflow/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js      # Register, login, notifications, user search
│   │   │   ├── projectController.js   # CRUD projects, invite/remove members
│   │   │   └── taskController.js      # CRUD tasks, move, comments
│   │   ├── middleware/
│   │   │   └── auth.js                # JWT protect middleware + socket auth
│   │   ├── models/
│   │   │   ├── User.js                # User schema with notifications array
│   │   │   ├── Project.js             # Project schema with members & columns
│   │   │   └── Task.js                # Task schema with checklist & comments
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── projects.js
│   │   │   └── tasks.js
│   │   ├── socket/
│   │   │   ├── index.js               # Socket.io server setup, room management
│   │   │   └── notifications.js       # Real-time notification helper
│   │   └── index.js                   # Express app entry point
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── board/
│   │   │   │   ├── CreateProjectModal.jsx
│   │   │   │   └── InviteMemberModal.jsx
│   │   │   ├── layout/
│   │   │   │   ├── Layout.jsx         # Sidebar + nav + notification bell
│   │   │   │   └── Layout.css
│   │   │   ├── notifications/
│   │   │   │   ├── NotificationsPanel.jsx
│   │   │   │   └── NotificationsPanel.css
│   │   │   └── task/
│   │   │       ├── CreateTaskModal.jsx
│   │   │       ├── TaskModal.jsx      # Full task detail view
│   │   │       └── TaskModal.css
│   │   ├── context/
│   │   │   └── AuthContext.jsx        # Auth state + socket init
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   └── ProjectPage.jsx        # Kanban board with DnD
│   │   ├── utils/
│   │   │   ├── api.js                 # Axios instance with JWT interceptors
│   │   │   └── socket.js              # Socket.io client singleton
│   │   ├── App.jsx
│   │   ├── index.js
│   │   └── index.css
│   ├── public/
│   │   └── index.html
│   ├── .env.example
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| GET | `/api/auth/notifications` | Get notifications |
| PUT | `/api/auth/notifications/read` | Mark all read |
| GET | `/api/auth/search?q=` | Search users |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | Get all my projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get single project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:id/invite` | Invite member |
| DELETE | `/api/projects/:id/members/:userId` | Remove member |
| GET | `/api/projects/:id/stats` | Project stats |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:pid/tasks` | Get all tasks |
| POST | `/api/projects/:pid/tasks` | Create task |
| GET | `/api/projects/:pid/tasks/:tid` | Get single task |
| PUT | `/api/projects/:pid/tasks/:tid` | Update task |
| PUT | `/api/projects/:pid/tasks/:tid/move` | Move task (column/order) |
| DELETE | `/api/projects/:pid/tasks/:tid` | Delete task |
| POST | `/api/projects/:pid/tasks/:tid/comments` | Add comment |
| PUT | `/api/projects/:pid/tasks/:tid/comments/:cid` | Edit comment |
| DELETE | `/api/projects/:pid/tasks/:tid/comments/:cid` | Delete comment |

---

## 🔌 WebSocket Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `join:project` | `projectId` | Join project room |
| `leave:project` | `projectId` | Leave project room |
| `typing:start` | `{ taskId, projectId }` | User is typing |
| `typing:stop` | `{ taskId, projectId }` | User stopped typing |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `task:created` | `{ task }` | New task created |
| `task:updated` | `{ task }` | Task updated |
| `task:deleted` | `{ taskId }` | Task deleted |
| `task:moved` | `{ taskId, columnId, order }` | Task moved |
| `comment:added` | `{ taskId, comment }` | New comment |
| `comment:updated` | `{ taskId, comment }` | Comment edited |
| `comment:deleted` | `{ taskId, commentId }` | Comment deleted |
| `user:joined` | `{ user }` | Member came online |
| `user:left` | `{ userId }` | Member went offline |
| `notification` | `{ type, message, link }` | Real-time notification |

---

## 🌱 Environment Variables

### Backend `.env`
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/projectflow
JWT_SECRET=your_super_secret_key_min_32_chars
JWT_EXPIRE=7d
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

### Frontend `.env`
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

## 🧪 Testing the App

1. Register two accounts in different browser tabs/windows
2. Create a project with Account 1
3. Invite Account 2 by email
4. Log in as Account 2 — you'll see the project and a notification
5. Both users open the same project board
6. Create, move, and update tasks — changes appear live for both users!

---

## 🔒 Security Notes

- Change `JWT_SECRET` to a long random string in production
- Use environment variables, never hardcode secrets
- MongoDB should not be publicly exposed in production
- Consider adding rate limiting (`express-rate-limit`) for production

---

Built with ❤️ using the MERN stack + Socket.io
