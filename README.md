# Studyday

Studyday is a student assignment manager built with React, an Express REST API, MongoDB, and Auth0. Each student's assignments and classes are scoped to their verified Auth0 identity.

## Requirements

- Node.js 20.19+ (or 22.12+)
- MongoDB running locally or a MongoDB Atlas connection string
- An Auth0 single-page application and API

## Configure Auth0

1. In the Auth0 dashboard, create an API with identifier `https://api.studyday.local` (or choose a different identifier and use it as the audience in both frontend and server settings).
2. Create a single-page application and configure its allowed callback, logout, and web origins to include `http://localhost:5173`.
3. Copy `.env.example` to `.env`, then set the Auth0 tenant domain, SPA client ID, API audience, and `MONGODB_URI`. Set `AUTH0_AUDIENCE` to the same API identifier as `VITE_AUTH0_AUDIENCE`, and keep the `AUTH0_CLIENT_ID`/`AUTH0_DOMAIN` values aligned with the SPA configuration.
4. For a non-local frontend, set `CLIENT_ORIGIN` to its exact origin.

The Auth0 domain, SPA client ID, and API audience are public application configuration, not secrets. Never put an Auth0 client secret or MongoDB credentials in a `VITE_` variable.

## Run locally

```sh
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). The frontend and API run together; Vite proxies `/api` to Express on port 3001.

To run only the React frontend, use `npm run web`. To run only the API, use `npm run dev:server` during development or `npm start` in production.

## API

Assignment and class routes require an Auth0 access token for the configured audience. The health endpoint is public.

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/health` | API and database health |
| `GET` | `/api/assignments` | List the authenticated student's assignments |
| `POST` | `/api/assignments` | Create an assignment |
| `PATCH` | `/api/assignments/:id` | Update assignment fields or completion |
| `DELETE` | `/api/assignments/:id` | Delete an assignment |
| `GET` | `/api/classes` | List the student's classes |
| `POST` | `/api/classes` | Add a class |

Assignments use `{ title, className, dueDate, priority, completed }`. Dates are `YYYY-MM-DD`; priority is `low`, `medium`, or `high`. Classes are `{ name }`.

```sh
npm test
npm run build
```
