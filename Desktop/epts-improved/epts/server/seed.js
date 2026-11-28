// Creates the database, the two tables, one manager, and sample data.  Run: npm run seed
import mysql from "mysql2/promise";
import { DB, monday } from "./db.js";

const c = await mysql.createConnection({
  host: DB.host,
  user: DB.user,
  password: DB.password,
  multipleStatements: true,
});
await c.query(`
  CREATE DATABASE IF NOT EXISTS ${DB.database};
  USE ${DB.database};
  DROP TABLE IF EXISTS weekly_records;
  DROP TABLE IF EXISTS users;
  CREATE TABLE users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(120) NOT NULL UNIQUE,
    password VARCHAR(50) NOT NULL,
    full_name     VARCHAR(60) NULL,
    role          ENUM('manager','employee') NOT NULL DEFAULT 'employee',
    status        ENUM('pending','active') NOT NULL DEFAULT 'pending',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE weekly_records (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    week_start      DATE NOT NULL,
    hours           DECIMAL(5,1) NOT NULL,
    tasks_assigned  INT NOT NULL,
    tasks_completed INT NOT NULL,
    notes           TEXT,
    status          ENUM('draft','submitted','approved') NOT NULL DEFAULT 'draft',
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY one_per_week (user_id, week_start),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`);
const add = (email, pw, name, role, status) =>
  c
    .query(
      "INSERT INTO users (email,password,full_name,role,status) VALUES (?,?,?,?,?)",
      [email, pw, name, role, status],
    )
    .then(([x]) => x.insertId);
await add(
  "manager@work.com",
  "Manager123!",
  "Jessie Lumen",
  "manager",
  "active",
);
const names = [
  ["benhard.awanon", "Benhard Benhard"],
  ["greg.awanon", "Greg Awanon"],
  ["jonel.malyorga", "Jonel Malyorga"],
  ["shrink.awanon", "Shrink Awanon"],
];
const ids = [];
for (const [e, n] of names)
  ids.push(
    await add(`${e}@work.com`, "Employee123!", n, "employee", "active"),
  );
await add("new.hire@work.com", "Employee123!", null, "employee", "pending");

const base = new Date(monday() + "T00:00:00");
for (let i = 0; i < ids.length; i++)
  for (let back = 5; back >= 0; back--) {
    const d = new Date(base);
    d.setDate(d.getDate() - 7 * back);
    const p = (n) => String(n).padStart(2, "0"),
      wk = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    const assigned = 16 + ((i * 3 + back) % 8),
      done = Math.min(
        assigned,
        Math.round(assigned * (0.62 + 0.07 * ((i + back * 2) % 5))),
      );
    let status = "approved";
    if (back === 0) {
      if (i === 2) continue;
      status = i === 1 ? "draft" : "submitted";
    }
    await c.query(
      "INSERT INTO weekly_records (user_id,week_start,hours,tasks_assigned,tasks_completed,notes,status) VALUES (?,?,?,?,?,?,?)",
      [ids[i], wk, 32 + ((i + back) % 9), assigned, done, "", status],
    );
  }
console.log(
  "Database ready. Manager: manager@work.com / Manager123!   Employees: benhard.awanon@work.com / Employee123!",
);
await c.end();
