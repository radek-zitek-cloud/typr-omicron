# Typr Omicron Backend

Backend API server for the Typr Omicron typing test application. Provides REST API endpoints for managing user profiles, settings, and typing test sessions with SQLite database persistence.

## Features

- **User Management**: Create, retrieve, and manage user profiles
- **Settings Persistence**: Store and update user preferences (font, theme, sound)
- **Session History**: Save and retrieve typing test session data
- **SQLite Database**: Lightweight, file-based database for data persistence
- **RESTful API**: Clean API design with JSON responses
- **Rate Limiting**: Protection against abuse with IP-based rate limiting
- **CORS Support**: Configured for cross-origin requests from frontend

## Prerequisites

- Node.js v20 or higher
- npm v10 or higher

## Installation

```bash
cd backend
npm install
```

## Configuration

Copy the example environment file and modify as needed:

```bash
cp .env.example .env
```

Environment variables:
- `PORT`: Server port (default: 3001)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:5173)

## Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3001` by default.

## API Endpoints

### Health Check
- `GET /health` - Check server status

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:userId` - Get specific user
- `POST /api/users` - Create new user
- `DELETE /api/users/:userId` - Delete user

### Settings
- `GET /api/settings/:userId` - Get user settings
- `PUT /api/settings/:userId` - Update user settings

### Sessions
- `GET /api/sessions/user/:userId` - Get all sessions for a user
- `GET /api/sessions/:sessionId` - Get specific session
- `POST /api/sessions` - Create new session
- `DELETE /api/sessions/:sessionId` - Delete session

## Database Schema

### Users Table
- `user_id` (TEXT, PRIMARY KEY)
- `username` (TEXT, UNIQUE)
- `created_at` (INTEGER)

### User Settings Table
- `user_id` (TEXT, PRIMARY KEY, FOREIGN KEY)
- `font` (TEXT)
- `font_size` (TEXT)
- `theme` (TEXT)
- `sound_enabled` (INTEGER)

### Sessions Table
- `session_id` (TEXT, PRIMARY KEY)
- `user_id` (TEXT, FOREIGN KEY)
- `mode` (TEXT)
- `mode_value` (INTEGER)
- `text` (TEXT)
- `user_input` (TEXT)
- `events` (TEXT, JSON)
- `session_duration` (INTEGER)
- `accuracy` (REAL)
- `max_index_reached` (INTEGER)
- `mechanical_cpm` (REAL)
- `productive_cpm` (REAL)
- `char_states` (TEXT, JSON)
- `timestamp` (TEXT)
- `created_at` (INTEGER)

## Technology Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js 5.x
- **Database**: SQLite (better-sqlite3)
- **Security**: Rate limiting (express-rate-limit)
- **CORS**: CORS middleware
- **Environment**: dotenv

## Rate Limiting

The API includes rate limiting to protect against abuse:

- **General API routes**: 100 requests per 15 minutes per IP
- **Write operations** (POST, PUT, DELETE): 50 requests per 15 minutes per IP

Rate limit headers are included in responses:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in current window
- `RateLimit-Reset`: Seconds until the rate limit resets

## Development

The database is automatically initialized when the server starts. A default "Guest" user is created on first run.

Database file location: `backend/data/typr.db`
