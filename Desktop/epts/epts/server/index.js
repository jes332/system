import express from "express";
import jwt from "jsonwebtoken";
import db, { monday } from "./db.js";

// The JWT signing secret can be set in the environment (JWT_SECRET). The old demo value stays
// as the fallback so the current XAMPP setup keeps working without any extra step.
const app = express(),
  SECRET = process.env.JWT_SECRET || "epts-demo-secret";
if (!process.env.JWT_SECRET)
  console.warn("JWT_SECRET is not set. Using the demo secret (fine for local XAMPP use only).");
app.use(express.json());

// ---------- helpers ----------
const h = (f) => (q, r) =>
  f(q, r).catch((e) => {
    console.error(e);
    r.status(500).json({ error: "Something went wrong. Please try again." });
  });
const bad = (r, m) => r.status(400).json({ error: m });
const auth = (role) => (q, r, next) => {
  try {
    q.user = jwt.verify((q.headers.authorization || "").slice(7), SECRET);
  } catch {
    return r.status(401).json({ error: "Please sign in again." });
  }
  if (role && q.user.role !== role)
    return r.status(403).json({ error: "You do not have access to this." });
  next();
};
// Column sorting: only whitelisted column names can reach the SQL text
const orderBy = (cols, q, fallback) =>
  `ORDER BY ${cols[q.sort] || fallback} ${q.dir === "desc" ? "DESC" : "ASC"}`;
// Search: builds a WHERE ... LIKE piece. The words typed by the user are passed as
// ? parameters (never pasted into the SQL text), so they cannot change the query.
const search = (q, cols) => {
  const text = String(q.search || "").trim().slice(0, 60);
  if (!text) return { sql: "", params: [] };
  const like = "%" + text.replace(/[\\%_]/g, "\\$&") + "%";
  return {
    sql: "(" + cols.map((c) => `${c} LIKE ?`).join(" OR ") + ")",
    params: cols.map(() => like),
  };
};
const check = (b) => {
  const hrs = +b.hours,
    a = +b.tasks_assigned,
    c = +b.tasks_completed;
  if (!(hrs >= 0 && hrs <= 168)) return "Hours must be between 0 and 168.";
  if (!Number.isInteger(a) || a < 1)
    return "Tasks assigned must be at least 1.";
  if (!Number.isInteger(c) || c < 0)
    return "Tasks completed must be 0 or more.";
  if (c > a) return "Tasks completed cannot be more than tasks assigned.";
  if (!["draft", "submitted"].includes(b.status)) return "Invalid status.";
};

// ---------- accounts ----------
app.post(
  "/api/register",
  h(async (q, r) => {
    const email = String(q.body.email || "")
        .trim()
        .toLowerCase(),
      pw = String(q.body.password || "");
    if (!/^\S+@\S+\.\S+$/.test(email))
      return bad(r, "Please enter a valid work email.");
    if (pw.length < 8) return bad(r, "Password must be at least 8 characters.");
    const [[old]] = await db.query("SELECT id FROM users WHERE email=?", [
      email,
    ]);
    if (old) return bad(r, "This email is already registered.");
    await db.query(
      "INSERT INTO users (email, password, role, status) VALUES (?, ?, 'employee', 'pending')",
      [email, pw],
    );
    r.status(201).json({
      message: "Account created. Please wait for your manager to approve it.",
    });
  }),
);

app.post(
  "/api/login",
  h(async (q, r) => {
    const [[u]] = await db.query("SELECT * FROM users WHERE email=?", [
      String(q.body.email || "")
        .trim()
        .toLowerCase(),
    ]);
    if (!u || String(q.body.password || "") !== u.password)
      return r.status(401).json({ error: "Email or password is incorrect." });
    if (u.status === "pending")
      return r
        .status(403)
        .json({ error: "Your account is still waiting for manager approval." });
    r.json({
      token: jwt.sign({ id: u.id, role: u.role }, SECRET, { expiresIn: "8h" }),
      user: { id: u.id, email: u.email, role: u.role, full_name: u.full_name },
    });
  }),
);

app.get(
  "/api/me",
  auth(),
  h(async (q, r) => {
    const [[u]] = await db.query(
      "SELECT id, email, role, full_name FROM users WHERE id=?",
      [q.user.id],
    );
    u ? r.json(u) : r.status(401).json({ error: "Please sign in again." });
  }),
);
app.put(
  "/api/me",
  auth(),
  h(async (q, r) => {
    const n = String(q.body.full_name || "").trim();
    if (n.length < 2 || n.length > 60)
      return bad(r, "Please enter your full name.");
    await db.query("UPDATE users SET full_name=? WHERE id=?", [n, q.user.id]);
    r.json({ full_name: n });
  }),
);

// ---------- TABLE 1: users (manager: People page) ----------
const U = {
  name: "full_name",
  email: "email",
  status: "status",
  joined: "created_at",
};
app.get(
  "/api/users",
  auth("manager"),
  h(async (q, r) => {
    const f = search(q.query, ["full_name", "email", "status"]);
    const [rows] = await db.query(
      `SELECT id, email, full_name, status, created_at FROM users WHERE role='employee' ${f.sql && "AND " + f.sql} ${orderBy(U, q.query, "created_at")}`,
      f.params,
    );
    r.json(rows);
  }),
);
app.put(
  "/api/users/:id/approve",
  auth("manager"),
  h(async (q, r) => {
    const [x] = await db.query(
      "UPDATE users SET status='active' WHERE id=? AND role='employee' AND status='pending'",
      [q.params.id],
    );
    x.affectedRows
      ? r.json({ ok: true })
      : r
          .status(409)
          .json({ error: "This account is no longer waiting for approval." });
  }),
);
// EDIT + UPDATE: the manager changes name, email and status of one employee
app.put(
  "/api/users/:id",
  auth("manager"),
  h(async (q, r) => {
    const name = String(q.body.full_name || "").trim(),
      email = String(q.body.email || "")
        .trim()
        .toLowerCase(),
      status = q.body.status;
    if (name && (name.length < 2 || name.length > 60))
      return bad(r, "Name must be 2 to 60 characters, or left empty.");
    if (!/^\S+@\S+\.\S+$/.test(email))
      return bad(r, "Please enter a valid work email.");
    if (!["pending", "active"].includes(status))
      return bad(r, "Invalid status.");
    const [[dup]] = await db.query(
      "SELECT id FROM users WHERE email=? AND id<>?",
      [email, q.params.id],
    );
    if (dup) return bad(r, "This email is already used by another account.");
    const [x] = await db.query(
      "UPDATE users SET full_name=?, email=?, status=? WHERE id=? AND role='employee'",
      [name || null, email, status, q.params.id],
    );
    x.affectedRows
      ? r.json({ ok: true })
      : r.status(404).json({ error: "That employee no longer exists." });
  }),
);
// DELETE: removes one employee (their weekly reports go too, ON DELETE CASCADE)
app.delete(
  "/api/users/:id",
  auth("manager"),
  h(async (q, r) => {
    const [x] = await db.query(
      "DELETE FROM users WHERE id=? AND role='employee'",
      [q.params.id],
    );
    x.affectedRows
      ? r.json({ ok: true })
      : r.status(404).json({ error: "That employee no longer exists." });
  }),
);

// ---------- TABLE 2: weekly_records (manager: Weekly Records, employee: My Records) ----------
const R = {
  person: "person",
  week: "r.week_start",
  hours: "r.hours",
  assigned: "r.tasks_assigned",
  completed: "r.tasks_completed",
  rate: "rate",
  // ENUM columns sort by their position in the list, not alphabetically. FIELD() puts the
  // reports that need review first when sorted ascending.
  status: "FIELD(r.status, 'submitted', 'approved', 'draft')",
};
const SELECT = `SELECT r.id, r.user_id, COALESCE(u.full_name, u.email) AS person, r.week_start, r.hours, r.tasks_assigned, r.tasks_completed,
  ROUND(r.tasks_completed / r.tasks_assigned * 100, 1) AS rate, r.status, r.notes
  FROM weekly_records r JOIN users u ON u.id = r.user_id`;
app.get(
  "/api/records",
  auth(),
  h(async (q, r) => {
    const mgr = q.user.role === "manager";
    const f = search(q.query, [
      "COALESCE(u.full_name, u.email)",
      "r.status",
      "r.week_start",
    ]);
    const [rows] = await db.query(
      `${SELECT} WHERE ${mgr ? "r.status <> 'draft'" : "r.user_id = ?"} ${f.sql && "AND " + f.sql} ${orderBy(R, q.query, "r.week_start")}`,
      [...(mgr ? [] : [q.user.id]), ...f.params],
    );
    r.json(rows);
  }),
);
app.get(
  "/api/records/current",
  auth("employee"),
  h(async (q, r) => {
    const [[x]] = await db.query(
      "SELECT * FROM weekly_records WHERE user_id=? AND week_start=?",
      [q.user.id, monday()],
    );
    r.json(x || null);
  }),
);
app.post(
  "/api/records",
  auth("employee"),
  h(async (q, r) => {
    const m = check(q.body);
    if (m) return bad(r, m);
    const b = q.body;
    try {
      await db.query(
        "INSERT INTO weekly_records (user_id, week_start, hours, tasks_assigned, tasks_completed, notes, status) VALUES (?,?,?,?,?,?,?)",
        [
          q.user.id,
          monday(),
          b.hours,
          b.tasks_assigned,
          b.tasks_completed,
          b.notes || "",
          b.status,
        ],
      );
      r.status(201).json({ ok: true });
    } catch (e) {
      if (e.errno === 1062)
        return bad(r, "You already have a report for this week.");
      throw e;
    }
  }),
);
app.put(
  "/api/records/:id",
  auth("employee"),
  h(async (q, r) => {
    const m = check(q.body);
    if (m) return bad(r, m);
    const b = q.body;
    const [x] = await db.query(
      "UPDATE weekly_records SET hours=?, tasks_assigned=?, tasks_completed=?, notes=?, status=? WHERE id=? AND user_id=? AND status='draft'",
      [
        b.hours,
        b.tasks_assigned,
        b.tasks_completed,
        b.notes || "",
        b.status,
        q.params.id,
        q.user.id,
      ],
    );
    x.affectedRows
      ? r.json({ ok: true })
      : bad(r, "Only a report that has not been sent can be changed.");
  }),
);
app.put(
  "/api/records/:id/approve",
  auth("manager"),
  h(async (q, r) => {
    const [x] = await db.query(
      "UPDATE weekly_records SET status='approved' WHERE id=? AND status='submitted'",
      [q.params.id],
    );
    x.affectedRows
      ? r.json({ ok: true })
      : r
          .status(409)
          .json({ error: "This report is no longer waiting for review." });
  }),
);
app.delete(
  "/api/records/:id",
  auth("employee"),
  h(async (q, r) => {
    const [x] = await db.query(
      "DELETE FROM weekly_records WHERE id=? AND user_id=? AND status='draft'",
      [q.params.id, q.user.id],
    );
    x.affectedRows
      ? r.json({ ok: true })
      : r
          .status(404)
          .json({ error: "That draft no longer exists or was already sent." });
  }),
);

// ---------- manager overview ----------
app.get(
  "/api/overview",
  auth("manager"),
  h(async (q, r) => {
    const [[c]] = await db.query(`SELECT
    (SELECT COUNT(*) FROM users WHERE role='employee' AND status='active') AS employees,
    (SELECT COUNT(*) FROM users WHERE role='employee' AND status='pending') AS requests,
    (SELECT COUNT(*) FROM weekly_records WHERE status='submitted') AS waiting,
    (SELECT ROUND(SUM(tasks_completed) / SUM(tasks_assigned) * 100, 1) FROM weekly_records WHERE status <> 'draft') AS team`);
    const [t] = await db.query(
      "SELECT week_start, ROUND(SUM(tasks_completed) / SUM(tasks_assigned) * 100, 1) AS rate FROM weekly_records WHERE status <> 'draft' GROUP BY week_start ORDER BY week_start DESC LIMIT 8",
    );
    r.json({ ...c, trend: t.reverse() });
  }),
);

app.listen(3001, () =>
  console.log("EPTS server running on http://localhost:3001"),
);
