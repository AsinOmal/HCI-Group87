# Spacio — Furniture Planner

> **Build beautiful spaces at the speed of thought.**  
> A full-stack MERN web application for designing rooms in 2D and previewing them in real-time 3D.

<img width="1719" height="813" alt="Spacio Editor Overview" src="https://github.com/user-attachments/assets/54f38b54-ac4b-400e-8bef-b8a867834da3" />

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Getting Started](#getting-started)
   - [Manual Setup](#manual-setup)
   - [Docker Setup](#docker-setup-recommended)
6. [Environment Variables](#environment-variables)
7. [API Reference](#api-reference)
8. [Authentication](#authentication)
9. [Testing](#testing)
10. [Keyboard Shortcuts](#keyboard-shortcuts)
11. [Design System](#design-system)
12. [Key Dependencies](#key-dependencies)

---

## Overview

Spacio is a browser-based interior design tool. Users configure a room (dimensions, shape, colours), place furniture on a 2D floor plan, and instantly preview their layout in a live 3D scene. Designs are saved to a MongoDB database tied to authenticated user accounts.

The stack is:
- **Frontend** — React 19 + Vite, rendered in the browser
- **Backend** — Node.js + Express REST API
- **Database** — MongoDB with Mongoose ODM
- **Containerised** — Docker + Docker Compose for one-command deployment

---

## Features

### Room Configuration
- Set room **width and length** from 1–20 metres
- Choose from three **shapes**: Rectangle, Square, L-Shape
- Pick **wall and floor colours** with live canvas preview

### 2D Design Editor
- **Furniture Library** — 8 furniture types: Chair, Dining Table, Sofa, Bed, Side Table, Wardrobe, Desk, Bookshelf
- **Drag & Drop** — freely position items on the floor plan; clamped to floor boundaries
- **Transform Controls** — rotate (0–355°), scale (0.5×–2.5×), per-item colour picker
- **Snap to Grid** — toggle 0.25m grid snapping for precise alignment
- **Undo / Redo** — full history (Ctrl+Z / Ctrl+Y)
- **Export** — PDF floor plan with Bill of Materials, or PNG canvas screenshot
- **Rulers & Labels** — metric rulers along canvas edges; toggleable item type labels
- **Custom 3D Models** — upload `.glb` / `.gltf` files to add custom 3D furniture pieces

### 3D Preview
- Real-time WebGL rendering via Three.js / React Three Fiber
- Procedural multi-part geometry per furniture type (headboard, armrests, shelves, etc.)
- **Orbit Controls** — drag to orbit, scroll to zoom
- **First-Person Walkthrough** — WASD + mouse look (Pointer Lock)
- **Toggles** — hide/show walls, enable/disable shadows, adjust sunlight intensity
- **Persistent Settings** — viewport state (walls, shadows, shading) is synced between the Live 3D panel in the editor and the full 3D Preview page

### Dashboard & Design Management
- Save designs with a custom name; stored in MongoDB per user account
- View, open, and resume any previous design from the dashboard
- Delete designs with a confirmation modal

### Authentication
- **Registered accounts** — bcrypt-hashed passwords, stored in MongoDB
- **Dual-token JWT** — 15-minute access tokens + 7-day `HttpOnly` refresh cookies
- **Auto-refresh** — the frontend silently refreshes expired access tokens; no interruption to the user
- **Guest Mode** — enter the editor without an account; prompted to register when saving or uploading models
- **Inline AuthModal** — sign in, register, or continue as guest without a page redirect

### UI & Theming
- Full **dark mode** — one-click toggle, persisted in `localStorage`
- All pages respect the active theme via CSS custom properties
- Professional **Lucide SVG icon** set, consistent across both themes

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 7, React Router DOM v7 |
| **2D Canvas** | Konva + react-konva |
| **3D Rendering** | Three.js, @react-three/fiber, @react-three/drei |
| **PDF Export** | jsPDF + html2canvas |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB, Mongoose |
| **Auth** | JWT (jsonwebtoken), bcryptjs |
| **Security** | Helmet, express-rate-limit, Zod |
| **Icons** | Lucide React |
| **Styling** | Vanilla CSS + CSS custom properties |
| **Testing** | Vitest (frontend), Supertest + mongodb-memory-server (backend) |
| **Containerisation** | Docker, Docker Compose, Nginx |

---

## Project Structure

```
furniture-planner/
│
├── src/                          # React frontend source
│   ├── components/               # Shared UI components
│   │   ├── AuthModal.jsx         # Inline modal: sign in, sign up, guest mode
│   │   ├── Navbar.jsx            # Global sticky navigation bar
│   │   ├── DeleteModal.jsx       # Delete confirmation dialog
│   │   └── SaveModal.jsx         # Save design dialog
│   │
│   ├── context/
│   │   └── DesignContext.jsx     # Global state (room, furniture, viewport, auth)
│   │
│   ├── pages/
│   │   ├── Landing.jsx           # Home / marketing page
│   │   ├── Dashboard.jsx         # My Designs grid
│   │   ├── RoomSetup.jsx         # Room configuration wizard
│   │   ├── Editor2D.jsx          # Main drag-and-drop 2D editor
│   │   ├── Preview3D.jsx         # Full 3D preview page
│   │   └── Login.jsx             # Standalone login page
│   │
│   ├── utils/
│   │   └── api.js                # fetchWithAuth — JWT interceptor + auto-refresh
│   │
│   ├── App.jsx                   # Route definitions
│   ├── index.css                 # Global CSS tokens and reset
│   └── main.jsx                  # React entry point
│
├── server/                       # Express backend
│   ├── routes/
│   │   ├── auth.js               # POST /register, /login, /refresh, /logout
│   │   └── designs.js            # GET/POST/PUT/DELETE /designs
│   ├── middleware/
│   │   └── auth.js               # JWT verification middleware
│   ├── models/
│   │   ├── User.js               # Mongoose User schema
│   │   └── Design.js             # Mongoose Design schema
│   ├── tests/
│   │   └── api.test.js           # Supertest integration tests
│   └── index.js                  # Express app entry point
│
├── Dockerfile                    # Multi-stage: React build → Nginx serve
├── server/Dockerfile             # Node.js backend image
├── docker-compose.yml            # Orchestrates db + backend + frontend
├── nginx.conf                    # Nginx reverse proxy config
├── vite.config.js                # Vite dev proxy: /api → localhost:5005
└── index.html                    # HTML entry point
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **MongoDB** running locally (or use Docker)
- **Docker** (optional, for containerised setup)

---

### Manual Setup

```bash
# 1. Clone the repository
git clone https://github.com/AsinOmal/React-Spacio-FurniturePlanner.git
cd React-Spacio-FurniturePlanner

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd server && npm install && cd ..

# 4. Create backend environment file
cat > server/.env << 'EOF'
PORT=5005
MONGODB_URI=mongodb://localhost:27017/spacio
JWT_SECRET=replace-with-a-strong-random-secret
REFRESH_TOKEN_SECRET=replace-with-another-strong-secret
NODE_ENV=development
CLIENT_URL=http://localhost:5173
EOF

# 5. Start the backend (in one terminal)
cd server && npm run dev

# 6. Start the frontend (in another terminal)
npm run dev
```

The app will be available at **http://localhost:5173**

---

### Docker Setup (Recommended)

Runs the full stack (MongoDB + Express backend + Nginx-served React frontend) in isolated containers with a single command.

```bash
# Build and start all services in the background
docker compose up --build -d
```

| Service | Container | Port |
|---|---|---|
| MongoDB | `spacio_mongo` | 27017 |
| Express API | `spacio_backend` | 5005 |
| React (Nginx) | `spacio_frontend` | **80** |

The app will be available at **http://localhost**

```bash
# View logs from all services
docker compose logs -f

# Stop all services
docker compose down

# Stop and remove volumes (clears the database)
docker compose down -v
```

> **JWT Secret in Docker:** Set a custom secret by creating a `.env` file at the project root:
> ```
> JWT_SECRET=your-strong-production-secret
> ```

---

## Environment Variables

Create a `.env` file in the `server/` directory:

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5005` | Port the Express server listens on |
| `MONGODB_URI` | Yes | — | MongoDB connection string |
| `JWT_SECRET` | Yes | fallback (dev only) | Secret key for signing access tokens |
| `REFRESH_TOKEN_SECRET` | No | same as `JWT_SECRET` | Secret key for signing refresh tokens |
| `NODE_ENV` | No | `development` | Set to `production` to enable secure cookies |
| `CLIENT_URL` | No | `http://localhost:5173` | CORS origin for the frontend |

---

## API Reference

All routes except `/api/auth/*` require a valid `Authorization: Bearer <token>` header.

### Auth — `/api/auth`

| Method | Route | Body | Description |
|---|---|---|---|
| `POST` | `/register` | `{ email, password }` | Create a new user account |
| `POST` | `/login` | `{ email, password }` | Login; returns access token + sets refresh cookie |
| `POST` | `/refresh` | *(cookie)* | Issues a new access token using the refresh cookie |
| `POST` | `/logout` | *(cookie)* | Clears the refresh token cookie |

### Designs — `/api/designs`

| Method | Route | Body | Description |
|---|---|---|---|
| `GET` | `/` | — | Get all designs for the authenticated user |
| `POST` | `/` | `{ name, room, furniture }` | Save a new design |
| `PUT` | `/:id` | `{ name, room, furniture }` | Update an existing design by ID |
| `DELETE` | `/:id` | — | Delete a design by ID |

### Models — `/api/models`

| Method | Route | Description |
|---|---|---|
| `POST` | `/upload` | Upload a `.glb` / `.gltf` 3D model file (authenticated only) |

---

## Authentication

Spacio uses a **dual-token strategy**:

1. **Access Token** — short-lived (15 minutes), sent in the `Authorization` header on every API request.
2. **Refresh Token** — long-lived (7 days), stored in an `HttpOnly` cookie (not accessible to JavaScript). Used exclusively to issue new access tokens at `/api/auth/refresh`.

**Auto-refresh flow (frontend):**

```
Request → 401 Unauthorized
    └─ Call POST /api/auth/refresh (sends cookie automatically)
           ├─ Success → store new access token, retry original request
           └─ Failure → dispatch 'auth-expired' event → logout user
```

This means the user stays logged in for up to 7 days without re-entering credentials, but the attack surface of a stolen token is limited to 15 minutes.

### Demo Account

| Email | Password |
|---|---|
| `designer@spacio.app` | `furniture123` |

> Or click **"Continue as Guest"** on the auth modal to skip login entirely.

---

## Testing

### Frontend — Vitest

```bash
# Run in watch mode
npm run test

# Run once, output summary
npm run test:run
```

Tests cover:
- `clampToRoom` — furniture boundary clamping logic across all room shapes
- `shadeColor` — colour tinting utility used in the 3D renderer
- `DesignContext` — state management for room, furniture, undo history, and viewport

### Backend — Supertest

```bash
cd server && npm run test
```

Uses `mongodb-memory-server` — no real database needed. Tests cover:
- User registration and login
- JWT issuance and verification
- Design CRUD endpoints with ownership checks

**Current test count: 50 passing**

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl / Cmd + Z` | Undo last action |
| `Ctrl / Cmd + Y` | Redo |
| `Ctrl / Cmd + Shift + Z` | Redo (alternate) |
| `Delete` / `Backspace` | Remove selected item |
| `Ctrl + Scroll` | Zoom canvas in / out |
| `W A S D` | Move in first-person walk mode (3D) |
| `Mouse` | Look around in walk mode (3D) |
| `Esc` | Exit first-person walk mode |

---

## Design System

All colours, typography, and spacing are defined as CSS custom properties in `src/index.css`. Dark mode is activated by toggling the `html.dark` class, which reassigns all tokens automatically.

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--s-bg` | `#F7F4F0` | `#141210` | Page background |
| `--s-surface` | `#FFFFFF` | `#1E1B18` | Card / panel background |
| `--s-text` | `#1A1A1A` | `#F0EDE8` | Primary text |
| `--s-text-2` | `#6B6560` | `#A09890` | Secondary / muted text |
| `--s-accent` | `#B8874B` | `#B8874B` | Brand bronze — buttons, icons, highlights |
| `--s-border` | `#E8E2D9` | `#2E2A24` | Subtle borders |
| `--s-danger` | `#C0392B` | `#C0392B` | Destructive actions |
| `--f-serif` | Playfair Display | | Headings and logo |
| `--f-sans` | Inter | | Body text and UI |

---

## Key Dependencies

| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.2.0 | UI framework |
| `react-router-dom` | ^7.13.0 | Client-side routing |
| `konva` / `react-konva` | ^10.2.0 | 2D canvas engine |
| `three` | ^0.183.1 | WebGL 3D engine |
| `@react-three/fiber` | ^9.5.0 | React renderer for Three.js |
| `@react-three/drei` | ^10.7.7 | Three.js helpers |
| `lucide-react` | ^0.575.0 | SVG icon library |
| `jspdf` + `html2canvas` | latest | PDF generation |
| `express` | ^4.x | REST API framework |
| `mongoose` | ^8.x | MongoDB ODM |
| `jsonwebtoken` | ^9.x | JWT signing and verification |
| `bcryptjs` | ^2.x | Password hashing |
| `helmet` | ^8.0.0 | Secure HTTP headers |
| `express-rate-limit` | ^7.5.0 | IP rate limiting |
| `zod` | ^3.24.2 | Request payload validation |
| `vitest` | ^4.0.18 | Frontend test runner |
| `supertest` | ^7.0.0 | Backend HTTP integration tests |
| `mongodb-memory-server` | latest | In-memory MongoDB for tests |

---

<p align="center">Built with React, Konva, Three.js, and Express</p>
