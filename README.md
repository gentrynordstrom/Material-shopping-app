# Material Shopping App

A web app for the turnover coordinator to shop for and price out materials for turnover projects. Pulls material items from Monday.com and provides store-specific search links for **Menards** and **Home Depot** (Peru, IL), with price comparison tools.

## Architecture

- **Frontend**: React + Vite (deployed to Vercel)
- **Backend**: Node.js + Express (deployed to Render)
- **Data**: Monday.com as single source of truth via GraphQL API

## Quick Start

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env and add your MONDAY_API_TOKEN
npm install
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
# For local dev, VITE_API_URL=http://localhost:3001 is the default
npm install
npm run dev
```

## Environment Variables

### Backend (.env)

| Variable | Description |
|----------|-------------|
| `MONDAY_API_TOKEN` | Your Monday.com API token |
| `BOARD_ID` | Monday.com board ID (default: `7288152041`) |
| `PORT` | Server port (default: `3001`) |

### Frontend (.env)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | URL of the backend API |

## Deployment

- **Frontend**: Push to GitHub, connect to Vercel, set `VITE_API_URL` env var
- **Backend**: Push to GitHub, connect to Render as a Web Service, set env vars
