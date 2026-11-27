# EPTS: Employee Productivity Tracking System

Full-stack prototype: React (client) + Node.js/Express (server) + MySQL (XAMPP).

## First-time setup (Windows)

1. Install **Node.js LTS** (nodejs.org) and **XAMPP**. Start **MySQL** in the XAMPP Control Panel.
2. Open this folder in a terminal and run:
   - `npm run setup` (installs everything)
   - `npm run seed` (creates the database `epts_db`, its tables, and sample data)
3. Start the system: `npm run dev`, then open http://localhost:5173

## Demo accounts (created by the seed)

- Manager: `manager@work.com` / `Manager123!`
- Employee: `benhard.awanon@work.com` / `Employee123!`
- Waiting for approval: `new.hire@work.com` (approve it from People)
  Running `npm run seed` again resets the data.

## Structure

- `server/index.js` all API routes (login, users, weekly records, overview)
- `server/db.js` MySQL connection
- `server/seed.js` creates the tables and sample data
- `client/src/` pages (Auth, Employee, Manager), SortTable, Trend, styles.css
