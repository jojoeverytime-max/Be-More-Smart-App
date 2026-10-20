# Be More Smart on Study Day

Be More Smart on Study Day is a student assignment manager built with React, an Express REST API, MongoDB, and Auth0. Each student's assignments and classes are scoped to their verified Auth0 identity.

## Requirements

- Node.js 20.19+ (or 22.12+)
- MongoDB running locally or a MongoDB Atlas connection string
- An Auth0 single-page application and API

## Configure Auth0

1. In the Auth0 dashboard, create an API with identifier `https://api.studyday.local` (or choose a different identifier and use it as the audience in both frontend and server settings). Ensure the SPA application is permitted to request access tokens for this API.
2. Create a single-page application and configure its allowed callback, logout, and web origins to include `http://localhost:5173`.
3. Copy `.env.example` to `.env`, then set the Auth0 tenant domain, SPA client ID, API audience, and `MONGODB_URI`. Set `AUTH0_AUDIENCE` to the same API identifier as `VITE_AUTH0_AUDIENCE`, and keep the `AUTH0_CLIENT_ID`/`AUTH0_DOMAIN` values aligned with the SPA configuration.
4. For a non-local frontend, set `CLIENT_ORIGIN` to its exact origin.

The Auth0 domain, SPA client ID, and API audience are public application configuration, not secrets. Never put an Auth0 client secret or MongoDB credentials in a `VITE_` variable.

## Public chat

The dashboard includes one shared chat room visible to signed-in users. Messages are stored in MongoDB, readable by every authenticated user, and the chat refreshes automatically every 15 seconds. The API returns the 100 most recent messages. You can select and delete your own messages; other users' messages cannot be deleted by you.

## Due-date reminders

Use the bell in the dashboard to view incomplete assignments due within the next 7 days. Enable browser alerts there to receive a notification for assignments due today or tomorrow. Browser alerts require notification permission and Be More Smart on Study Day to remain open; the in-app reminder list remains available without browser notifications.

## Reward points

Completing an assignment earns 10 reward points the first time it is completed. Every 100 points advances one level, starting at level 1 and capping at level 99. Points are kept if an assignment is later marked incomplete, and completing it again does not award more points.

The career card lets students edit their current career. Its next-career estimate considers overall assignment completion, on-time work, earned reward points, performance by class, and saved outside activities. The suggestion refreshes daily at local midnight and whenever assignment or activity data changes. It shows the signals behind the suggestion; it is a motivational estimate, not a prediction of future career suitability.

## Outside-school activities

Add and remove personal activities such as sports, arts, clubs, and volunteering from the dashboard. Activities are saved to the signed-in student's account.

## Budget

Set a current budget balance and log income or expenses in US dollars. Income adds to the balance; expenses subtract from it. Removing a transaction reverses its balance change. The balance and transaction history are saved to the signed-in student's account.

## Run locally

```sh
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`). The frontend and API run together; Vite proxies `/api` to Express on port 3001.

To run only the React frontend, use `npm run web`. To run only the API, use `npm run dev:server` during development. In production, `npm start` builds the frontend and serves it alongside the API.

To test sign-in on a phone connected to the same Wi-Fi, run `npm run mobile` and open the Network URL printed by Vite (for example, `http://192.168.1.20:5173`). Add that exact URL to the Auth0 SPA's Allowed Callback URLs, Allowed Logout URLs, and Allowed Web Origins. If prompted, allow Node.js through the computer's private-network firewall. The Vite proxy forwards the API requests to the local server, so no LAN address is needed in `CLIENT_ORIGIN` for this development setup. The regular `npm run dev` command remains local-only.

### Deploy publicly on Render

The repository includes a Render Blueprint in `render.yaml` for deploying the React app and API together at a public HTTPS address:

1. Create a MongoDB Atlas database reachable by Render. Configure Atlas network access for the Render service's outbound IP addresses and have its MongoDB connection string ready.
2. In the [Render Dashboard](https://dashboard.render.com), choose **New > Blueprint**, connect this GitHub repository, and select the branch to deploy.
3. During setup, enter the requested Auth0 domain, SPA client ID, API audience, and MongoDB connection string. Use the same Auth0 domain and audience for both the `VITE_` and server variables. These values stay in Render's environment settings and are not committed to the repository.
4. After Render deploys, copy the service's HTTPS URL (for example, `https://be-more-smart-app.onrender.com`) and add it to the Auth0 SPA's **Allowed Callback URLs**, **Allowed Logout URLs**, and **Allowed Web Origins**. If you change any `VITE_AUTH0_` environment variables in Render, trigger a new deploy so the frontend is rebuilt with those values.
5. Open the HTTPS URL on a phone or computer from any network and sign in.

The API automatically allows the public Render URL for same-origin requests. If you add a custom domain or host the frontend separately, set `CLIENT_ORIGIN` to the frontend's exact HTTPS origin in Render. Render's free web-service plan may spin down when idle, so the first visit after inactivity can take longer. A LAN development URL from `npm run mobile` is only reachable while the phone and computer are on the same network.

If MongoDB Atlas SRV lookups fail with a DNS error, set `MONGODB_DNS_SERVERS` to a reachable DNS resolver (for example, `1.1.1.1` or `8.8.8.8`).

## API

Assignment, class, message, profile, activity, and budget routes require an Auth0 access token for the configured audience. The health endpoint is public.

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/health` | API and database health |
| `GET` | `/api/assignments` | List the authenticated student's assignments |
| `POST` | `/api/assignments` | Create an assignment |
| `PATCH` | `/api/assignments/:id` | Update assignment fields or completion |
| `DELETE` | `/api/assignments/:id` | Delete an assignment |
| `GET` | `/api/classes` | List the student's classes |
| `POST` | `/api/classes` | Add a class |
| `DELETE` | `/api/classes/:name` | Remove a class from the student's class list (existing assignments are kept) |
| `GET` | `/api/messages` | List the 100 most recent shared chat messages |
| `POST` | `/api/messages` | Post a message to the shared chat |
| `DELETE` | `/api/messages/:id` | Delete one of your own shared chat messages |
| `GET` | `/api/profile` | Get the authenticated student's career profile |
| `PUT` | `/api/profile` | Update the authenticated student's current career |
| `GET` | `/api/activities` | List the authenticated student's outside-school activities |
| `POST` | `/api/activities` | Add an outside-school activity |
| `DELETE` | `/api/activities/:id` | Delete one of the authenticated student's activities |
| `GET` | `/api/budget` | Get the authenticated student's current balance and expenses |
| `PUT` | `/api/budget` | Set the current budget balance |
| `POST` | `/api/budget/expenses` | Add an expense and deduct it from the balance |
| `DELETE` | `/api/budget/expenses/:id` | Remove an expense and refund it to the balance |
| `POST` | `/api/budget/income` | Add income and credit it to the balance |
| `DELETE` | `/api/budget/income/:id` | Remove income and deduct it from the balance |

Assignments use `{ title, className, activityName, dueDate, priority, completed }`. `className` may be empty for no class. `activityName` is optional and can be `Family` or `Jobs`. Dates are `YYYY-MM-DD`; priority is `low`, `medium`, or `high`. Classes are `{ name }`.

Budget values use US dollars: `{ currentBalance }` can be set on the budget, and income or expense entries use `{ description, amount, date }`. Adding income credits the balance; expenses debit it. Deleting a transaction reverses its balance change.

Use **Remove class** beside My Classes to select and remove classes, including built-in defaults. Existing assignments are kept. Removed defaults stay hidden for that student unless added again.

```sh
npm test
npm run build
```
