# SONAR – MSE-2 Full-Stack Upgrade

This upgrade preserves the existing HTML/CSS/JavaScript frontend and adds a Node.js + Express + MongoDB backend.

## What was added

- MongoDB models for users, buses and routes.
- Student registration/login APIs with bcrypt password hashing and JWT authentication.
- Protected profile update and account deletion APIs.
- Admin-only bus create/update/delete APIs and student/summary endpoints.
- Admin dashboard at `/admin.html`.
- Seed scripts to create four sample campus routes/buses and a configured admin account.
- Health endpoint at `/api/health`.

## Requirements

- Node.js 18 or newer
- A MongoDB Atlas cluster (or a locally running MongoDB instance)
- Internet access for Atlas

## 1. Configure MongoDB Atlas

1. Sign in to MongoDB Atlas and create a free cluster.
2. Create a database user with a username and password.
3. In Network Access, allow your current public IP address. For a temporary classroom demo only, Atlas also offers `0.0.0.0/0`; this permits access from anywhere and is less secure, so remove it after the demo.
4. Select Connect → Drivers and copy the connection string.
5. Replace `<username>`, `<password>` and the cluster host in the connection string. URL-encode special characters in the password.

## 2. Configure backend environment

Open a terminal in the `SONAR/server` folder and run:

```bash
npm install
```

Copy `.env.example` to `.env` (PowerShell):

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set:

```env
PORT=4000
MONGODB_URI=your-real-mongodb-atlas-connection-string
JWT_SECRET=make-this-a-long-random-secret-at-least-24-characters
CLIENT_ORIGIN=http://localhost:4000
ADMIN_NAME=SONAR Administrator
ADMIN_EMAIL=admin@sonar.local
ADMIN_PASSWORD=ChooseYourOwnStrongPassword123!
```

Do not share `.env`, your database password, JWT secret or admin password. `.env` is excluded by `.gitignore`.

## 3. Seed sample routes, buses and admin

From the `SONAR/server` folder:

```bash
npm run seed:admin
node src/seedData.js
```

The route/bus seed is safe to run again; it updates the four sample records instead of creating duplicates.

## 4. Start SONAR

From the `SONAR/server` folder:

```bash
npm start
```

Open these pages:

- Student application: http://localhost:4000/
- Admin dashboard: http://localhost:4000/admin.html
- API health: http://localhost:4000/api/health

Keep the terminal running while you use the application.

## 5. Demo sequence for MSE-2

1. Open `/api/health`; confirm `status: ok` and `database: connected`.
2. Register a student from the existing SONAR registration page.
3. Sign out and sign in with the same account.
4. Open My Profile, change the boarding stop/route and save.
5. Sign out. Sign in with the admin email/password configured in `.env`.
6. Open `/admin.html` and add a demo bus (e.g. `BUS-05`, `UP14-XY-5555`, driver name, route `R1`).
7. Change the bus status or delete the demo bus; refresh to show the database change persists.
8. Show the student list in the admin dashboard.

## API overview

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Server/database health |
| POST | `/api/auth/register` | Public | Create student account |
| POST | `/api/auth/login` | Public | Login and receive JWT |
| GET | `/api/auth/me` | Signed-in | Current profile |
| PATCH | `/api/auth/me` | Signed-in | Update profile preferences |
| DELETE | `/api/auth/me` | Signed-in | Delete own account |
| GET | `/api/buses` | Public | List buses |
| POST | `/api/buses` | Admin | Add bus |
| PATCH | `/api/buses/:id` | Admin | Update bus |
| DELETE | `/api/buses/:id` | Admin | Delete bus |
| GET | `/api/routes` | Public | List routes |
| POST/PATCH/DELETE | `/api/routes` | Admin | Manage routes |
| GET | `/api/admin/summary` | Admin | Dashboard counts |
| GET | `/api/admin/students` | Admin | List students |

Protected endpoints require `Authorization: Bearer <token>`.

## Important project limitations to explain honestly

- The original route animation and ETA remain a demonstration/simulation. The added GPS module accepts browser/device coordinates, stores them in MongoDB, and displays the latest readings; it is not yet connected to installed vehicle GPS hardware.
- The frontend map still uses its existing locally defined route geometry. The new MongoDB routes/buses are available through APIs and admin management, but the map visualization has not yet been refactored to draw every route from MongoDB.
- Browser LocalStorage stores only the login session token and safe profile snapshot. Passwords are hashed in MongoDB and are not stored in browser storage.
- For production, use HTTPS, a restricted Atlas IP allowlist, strong unique secrets, validation, backups and a proper deployment configuration.

## 6. Backend GPS updates (MSE-2 addition)

The GPS module now saves device coordinates in each bus document in MongoDB and exposes the latest readings to the student tracker.

### How to demonstrate GPS updates

1. Start the backend and confirm `http://localhost:4000/api/health` reports `database: connected`.
2. Sign in as the administrator using the credentials configured in `server/.env`.
3. Open `http://localhost:4000/admin.html`.
4. In **Bus Fleet & GPS Updates**, click **Start GPS sharing** beside a bus.
5. Allow the browser location permission. Keep the Admin Dashboard open while the device moves; it sends a location update at most every five seconds. Click **Stop GPS sharing** when finished. Use `localhost` for the practical demo; browser geolocation generally requires HTTPS or a secure localhost context.
6. The backend validates the coordinates, saves `latitude`, `longitude` and `lastUpdated` in MongoDB, and returns the updated bus.
7. Open the student tracker (`http://localhost:4000/#/track`). The **Backend GPS Feed** refreshes every five seconds and shows the latest coordinates. GPS markers are plotted on the route illustration when they fall inside the western-UP coordinate display bounds.

For a realistic demonstration, open the admin dashboard on a phone and use that phone as the bus location device. The phone should travel with the bus. Using a laptop's location only demonstrates the browser/device GPS handoff; it does not prove the physical bus is at that location.

### GPS API endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/buses/locations/latest` | Public | Read latest saved GPS positions |
| POST | `/api/buses/:id/location` | Admin JWT | Save latitude and longitude for a bus |

Example request body:

```json
{
  "latitude": 28.6721,
  "longitude": 77.4391
}
```

The POST endpoint requires `Authorization: Bearer <admin-token>`. It rejects invalid latitude/longitude values and unknown bus IDs.

### Important GPS limitations

- This is device/browser GPS reporting, not an installed vehicle GPS tracker or dedicated driver app.
- For the college demonstration, an administrator account is used to share the device location for a selected bus. A production release should introduce driver accounts and permit only an assigned driver to update their assigned bus.
- The tracker polls the latest stored reading every five seconds. The admin device sends updates while GPS sharing is active, but the system does not yet store a full location history, calculate road distance, or derive ETA from GPS coordinates.
- The existing colored route lines are illustrative SVG routes. GPS dots use a simple western-Uttar-Pradesh coordinate projection; they are not snapped to surveyed roads or a map provider.
- Real vehicle tracking requires a phone/device kept in each bus, driver authorization, reliable mobile data, and a production HTTPS deployment.
