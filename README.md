# SplitEase — Group Expense Tracker

A full-stack web application for managing and splitting shared expenses with friends and family.

## Features

- **User Auth** — Register and log in with JWT-secured sessions
- **Friends** — Send/accept friend requests, search users by name or email
- **Expenses** — Create expenses with equal or custom splits across multiple participants
- **Categories** — Tag expenses as transportation, restaurant, trip, event, or other
- **Balances** — Automatically calculated net balances per person
- **Payments** — Record settlements and link them to specific expenses
- **Dashboard** — Overview of stats, balances, and recent activity

## Tech Stack

| Layer     | Technology                     |
|-----------|-------------------------------|
| Frontend  | React 18, React Router v6, Axios, Vite |
| Backend   | Node.js, Express.js           |
| Database  | MongoDB + Mongoose            |
| Auth      | JWT (jsonwebtoken) + bcryptjs |

---

## Project Structure

```
Group Expense Project/
├── backend/
│   ├── src/
│   │   ├── config/db.js          # MongoDB connection
│   │   ├── middleware/auth.js    # JWT protect middleware
│   │   ├── models/               # Mongoose models
│   │   │   ├── User.js
│   │   │   ├── Friendship.js
│   │   │   ├── Expense.js
│   │   │   └── Payment.js
│   │   ├── routes/               # Express route handlers
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   ├── friends.js
│   │   │   ├── expenses.js
│   │   │   ├── payments.js
│   │   │   └── balances.js
│   │   └── app.js                # Express app setup
│   ├── server.js                 # Entry point
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Auth/             # Login, Register
    │   │   ├── Dashboard/        # Home page
    │   │   ├── Expenses/         # ExpenseList, CreateExpense modal
    │   │   ├── Friends/          # Friends management
    │   │   ├── Layout/           # Navbar, Sidebar, Layout wrapper
    │   │   └── Payments/         # Payment history + record modal
    │   ├── context/AuthContext.jsx
    │   ├── services/api.js       # Axios instance
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/) running locally (or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster)

---

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy the example env file and fill in your values
copy .env.example .env
```

Edit `backend/.env`:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/group-expense
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:5173
```

Start the backend in development mode:

```bash
npm run dev
```

The API will be available at `http://localhost:5000`.

---

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

> The Vite dev server proxies `/api` requests to `http://localhost:5000`, so no CORS issues in development.

---

## API Reference

| Method | Endpoint                            | Description                     |
|--------|-------------------------------------|---------------------------------|
| POST   | `/api/auth/register`                | Register a new account          |
| POST   | `/api/auth/login`                   | Login and receive JWT           |
| GET    | `/api/auth/me`                      | Get current user profile        |
| GET    | `/api/users/search?q=`              | Search users by name/email      |
| GET    | `/api/friends`                      | List accepted friends           |
| GET    | `/api/friends/requests`             | Incoming friend requests        |
| POST   | `/api/friends/request/:userId`      | Send a friend request           |
| PUT    | `/api/friends/accept/:id`           | Accept a friend request         |
| DELETE | `/api/friends/:id`                  | Remove/reject a friendship      |
| GET    | `/api/expenses`                     | List expenses for current user  |
| POST   | `/api/expenses`                     | Create a new expense            |
| GET    | `/api/expenses/:id`                 | Get a single expense            |
| DELETE | `/api/expenses/:id`                 | Delete an expense (creator only)|
| GET    | `/api/payments`                     | List payments for current user  |
| POST   | `/api/payments`                     | Record a payment                |
| GET    | `/api/balances`                     | Net balance summary             |

---

## Building for Production

```bash
# Frontend
cd frontend
npm run build        # outputs to frontend/dist/

# Backend — serve static files or deploy separately
cd backend
npm start
```

---

## Security Notes

- Passwords are hashed with **bcrypt** (10 salt rounds).
- All protected routes require a valid **JWT Bearer token**.
- Input is validated and sanitized using **express-validator**.
- MongoDB ObjectId parameters are validated before any database query.
- CORS is restricted to the configured `CLIENT_URL`.
