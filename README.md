# CampusMind — Local Full-Stack University Counseling & Peer Support System

A local development build using **React + Vite**, **Node.js + Express**, and **MySQL**.
It does not use Laravel. The browser frontend talks to an Express REST API; the API stores
records in MySQL. Demo/localStorage records have been removed.

## Requirements

- Windows 10/11
- Node.js 20 LTS or newer (includes npm)
- XAMPP with MySQL/MariaDB
- A modern browser

## 1. Start MySQL

1. Open XAMPP Control Panel.
2. Start **MySQL**. Apache is not required for this Node/Vite setup.
3. Open `http://localhost/phpmyadmin`.
4. Import `database/campusmind.sql` using the **Import** tab.

The SQL creates the `campusmind` database and its tables. It does not create demo users.

## 2. Configure the backend

Open a terminal in `CampusMind_Local/server`:

```powershell
cd server
Copy-Item .env.example .env
notepad .env
```

Set `DB_USER` and `DB_PASSWORD` to match your XAMPP MySQL account. A default XAMPP
installation often uses `root` with an empty password, but confirm your own setup.

Install dependencies and start the API:

```powershell
npm install
npm run dev
```

The API runs at `http://localhost:4000`. Check `http://localhost:4000/api/health`.

## 3. Create the first administrator

Open a second terminal in `CampusMind_Local/server` and run:

```powershell
npm run create-admin
```

Enter the administrator's name, email and password when prompted. This creates the
first administrator in the database. Do not share the administrator password.

## 4. Start the frontend

Open a third terminal in `CampusMind_Local/client`:

```powershell
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

Sign in using the administrator account created in step 3. The administrator can create
counselor and peer-mentor accounts from **User Management**. Students can register from
the sign-in screen.

## 5. Local run order

Every time you work on the project:

1. Start MySQL in XAMPP.
2. Start the backend: `cd server` then `npm run dev`.
3. Start the frontend: `cd client` then `npm run dev`.
4. Browse to `http://localhost:5173`.

Keep the backend and frontend terminals open while using the system.

## Security and deployment notes

- Passwords are hashed with bcrypt.
- Authentication uses a signed JWT in an HttpOnly cookie.
- The API checks roles and record ownership on the server; hiding a button is not security.
- SQL queries use parameter placeholders.
- Helmet, CORS allow-listing, rate limiting, input validation and cookie settings are included.
- Intake requests and messages are restricted to authorized participants.
- This starter deliberately does not implement clinical diagnosis, emergency triage or clinical
  notes. Do not enter real counselling or health information into an unreviewed student project.
- Before internet/public deployment, configure HTTPS, strong unique secrets, database backups,
  least-privilege database credentials, institutional privacy policies, retention rules,
  audit logging, monitoring and a security review. Change all development configuration.
- The app is currently intended for local development on one computer/network, not production
  handling of sensitive student records.

## Main modules

- Authentication and role-based access
- Student and staff account management
- Counselor directory
- Appointment requests and counselor decisions
- Confidential intake requests with ownership/assignment checks
- Peer stories with moderation status
- Community discussions and moderation
- Participant-restricted messages
- Administrative overview reports

## Project structure

```text
CampusMind_Local/
  client/                 React + Vite frontend
  server/                 Express REST API
  database/campusmind.sql MySQL schema
```
