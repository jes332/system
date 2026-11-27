import { useEffect, useState } from "react";
import { api } from "../api";
import SortTable, { SearchBox, useList } from "../components/SortTable";
import Trend from "../components/Trend";
import { shortDate, STATUS, Status, weekText } from "../util";

export function Overview({ go }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    api("/overview").then(setD);
  }, []);
  if (!d) return <p className="muted">Loading…</p>;
  const parts = [];
  if (d.requests)
    parts.push(
      `${d.requests} account ${d.requests === 1 ? "request" : "requests"}`,
    );
  if (d.waiting)
    parts.push(`${d.waiting} ${d.waiting === 1 ? "report" : "reports"}`);
  const single = parts.length === 1 && d.requests + d.waiting === 1;
  const main = d.waiting
      ? ["records", "Review reports", d.waiting, "reports to review"]
      : ["people", "Review account requests", d.requests, "account requests"],
    other = d.waiting && d.requests > 0;
  return (
    <>
      <h1>
        {parts.length
          ? `${parts.join(" and ")} ${single ? "needs" : "need"} your review.`
          : "You are all caught up."}
      </h1>
      <p className="muted lead">
        {d.team
          ? `Your team completed ${d.team}% of assigned tasks.`
          : "No reports have been sent yet."}
      </p>
      <div className="facts">
        <div className="main">
          <b>{main[2]}</b>
          <span>{main[3]}</span>
        </div>
        <div>
          <b>{d.employees}</b>
          <span>active employees</span>
        </div>
        {other && (
          <div>
            <b>{d.requests}</b>
            <span>account requests</span>
          </div>
        )}
      </div>
      {parts.length > 0 && (
        <div className="row actions" style={{ marginBottom: "var(--s6)" }}>
          <button className="btn" onClick={() => go(main[0])}>
            {main[1]}
          </button>
          {other && (
            <button className="btn sec" onClick={() => go("people")}>
              Review account requests
            </button>
          )}
        </div>
      )}
      <div className="card">
        <h3>Team completion by week</h3>
        <Trend
          data={d.trend.map((t) => ({
            label: shortDate(t.week_start),
            rate: +t.rate,
          }))}
        />
      </div>
    </>
  );
}

export function People() {
  const list = useList("/users", "joined", "desc");
  // edit = the row being edited (null = no form shown), form = what is typed in it
  const [edit, setEdit] = useState(null),
    [form, setForm] = useState({ full_name: "", email: "", status: "active" }),
    [err, setErr] = useState(""),
    [msg, setMsg] = useState("");
  const act = async (fn) => {
    await fn();
    list.load();
  };
  // EDIT: open the form filled with the row that was clicked in the search results
  const openEdit = (r) => {
    setEdit(r);
    setForm({
      full_name: r.full_name || "",
      email: r.email,
      status: r.status,
    });
    setErr("");
    setMsg("");
  };
  const up = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    setErr("");
  };
  // UPDATE: send the form to the server, then read the list again (the search word stays)
  const save = async (e) => {
    e.preventDefault();
    try {
      await api(`/users/${edit.id}`, "PUT", form);
      setMsg(`Saved changes to ${form.full_name || form.email}.`);
      setEdit(null);
      list.load();
    } catch (x) {
      setErr(x.message);
    }
  };
  // DELETE: ask first, then remove the row and read the list again
  const del = async (r) => {
    const who = r.full_name || r.email;
    if (
      !confirm(
        `${r.status === "pending" ? "Decline this request from" : "Delete"} ${who}? ${r.status === "pending" ? "" : "Their reports will be deleted too."}`,
      )
    )
      return;
    try {
      await api(`/users/${r.id}`, "DELETE");
      if (edit && edit.id === r.id) setEdit(null);
      setMsg(`Deleted ${who}.`);
      list.load();
    } catch (x) {
      setMsg(x.message);
    }
  };
  const cols = [
    {
      label: "Name",
      sort: "name",
      cell: (r) => r.full_name || "Not added yet",
    },
    { label: "Email", sort: "email", key: "email" },
    {
      label: "Status",
      sort: "status",
      cell: (r) => <Status k={STATUS[r.status]} />,
    },
    { label: "Joined", sort: "joined", cell: (r) => shortDate(r.created_at) },
    {
      label: "Action",
      hide: true,
      cell: (r) => (
        <span className="row">
          {r.status === "pending" && (
            <button
              className="btn sm"
              onClick={() => act(() => api(`/users/${r.id}/approve`, "PUT"))}
            >
              Approve
            </button>
          )}
          <button className="link" onClick={() => openEdit(r)}>
            Edit
          </button>
          <button className="link" onClick={() => del(r)}>
            Delete
          </button>
        </span>
      ),
    },
  ];
  return (
    <>
      <h1>Approve accounts and manage your team</h1>
      <div className="card">
        <SearchBox
          list={list}
          label="Search employees"
          hint="Search by name, email, or status"
        />
        {msg && (
          <p className="ok" role="status">
            {msg}
          </p>
        )}
        {edit && (
          <form className="editpanel" onSubmit={save}>
            <h2>Edit {edit.full_name || edit.email}</h2>
            <div className="fields">
              <div>
                <label htmlFor="ed-name">Full name</label>
                <input
                  id="ed-name"
                  value={form.full_name}
                  onChange={up("full_name")}
                  placeholder="Not added yet"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="ed-email">Work email</label>
                <input
                  id="ed-email"
                  type="email"
                  value={form.email}
                  onChange={up("email")}
                  placeholder="name@work.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="ed-status">Status</label>
                <select
                  id="ed-status"
                  value={form.status}
                  onChange={up("status")}
                >
                  <option value="active">Active</option>
                  <option value="pending">Waiting for approval</option>
                </select>
              </div>
            </div>
            {err && (
              <p className="err" role="alert">
                {err}
              </p>
            )}
            <div className="row actions">
              <button className="btn">Update</button>
              <button
                type="button"
                className="link"
                onClick={() => setEdit(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        <SortTable
          cols={cols}
          list={list}
          empty="No employees have registered yet."
        />
      </div>
    </>
  );
}

export function WeeklyRecords() {
  const list = useList("/records", "status", "desc");
  const cols = [
    { label: "Employee", sort: "person", key: "person" },
    { label: "Week", sort: "week", cell: (r) => weekText(r.week_start) },
    { label: "Hours", sort: "hours", num: true, cell: (r) => +r.hours },
    { label: "Assigned", sort: "assigned", num: true, key: "tasks_assigned" },
    {
      label: "Completed",
      sort: "completed",
      num: true,
      key: "tasks_completed",
    },
    { label: "Score", sort: "rate", num: true, cell: (r) => r.rate + "%" },
    {
      label: "Status",
      sort: "status",
      cell: (r) => <Status k={STATUS[r.status]} />,
    },
    {
      label: "Action",
      hide: true,
      cell: (r) =>
        r.status === "submitted" && (
          <button
            className="btn sm"
            onClick={async () => {
              await api(`/records/${r.id}/approve`, "PUT");
              list.load();
            }}
          >
            Approve
          </button>
        ),
    },
  ];
  return (
    <>
      <h1>Review reports from your team</h1>
      <p className="muted lead">Reports waiting for review are listed first.</p>
      <div className="card">
        <SearchBox
          list={list}
          label="Search reports"
          hint="Search by employee, status, or week (e.g. 2026-11)"
        />
        <SortTable
          cols={cols}
          list={list}
          empty="No reports have been sent yet."
        />
      </div>
    </>
  );
}
