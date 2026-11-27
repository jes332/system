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
  const act = async (fn) => {
    await fn();
    list.load();
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
          <button
            className="link"
            onClick={() =>
              confirm(
                `${r.status === "pending" ? "Decline this request" : "Remove this employee and their reports"}?`,
              ) && act(() => api(`/users/${r.id}`, "DELETE"))
            }
          >
            {r.status === "pending" ? "Decline" : "Remove"}
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
