import { useEffect, useState } from "react";
import { api } from "../api";
import SortTable, { SearchBox, useList } from "../components/SortTable";
import Trend from "../components/Trend";
import { level, rate, shortDate, STATUS, Status, weekText } from "../util";

const EMPTY = { hours: "", tasks_assigned: "", tasks_completed: "", notes: "" };

export function MyWeek({ user }) {
  const [rec, setRec] = useState(undefined),
    [f, setF] = useState(EMPTY),
    [msg, setMsg] = useState(""),
    [err, setErr] = useState("");
  const load = () =>
    api("/records/current").then((x) => {
      setRec(x);
      if (x)
        setF({
          hours: x.hours,
          tasks_assigned: x.tasks_assigned,
          tasks_completed: x.tasks_completed,
          notes: x.notes || "",
        });
    });
  useEffect(() => {
    load();
  }, []);
  if (rec === undefined) return <p className="muted">Loading…</p>;
  const open = !rec || rec.status === "draft",
    pct = rate(+f.tasks_completed, +f.tasks_assigned);
  const n = (k) => (e) => {
    setF({ ...f, [k]: e.target.value });
    setErr("");
    setMsg("");
  };
  const save = async (status) => {
    setErr("");
    try {
      await api(rec ? `/records/${rec.id}` : "/records", rec ? "PUT" : "POST", {
        ...f,
        status,
      });
      setMsg(
        status === "submitted"
          ? "Sent to your manager for review."
          : "Saved. You can finish it later.",
      );
      await load();
    } catch (x) {
      setErr(x.message);
    }
  };
  const remove = async () => {
    await api(`/records/${rec.id}`, "DELETE");
    setRec(null);
    setF(EMPTY);
    setMsg("Draft deleted.");
  };
  const done = +f.tasks_completed || 0,
    planned = +f.tasks_assigned || 0;
  return (
    <>
      <h1>{user.full_name.split(" ")[0]}, report your week</h1>
      <p className="muted lead">
        {rec ? weekText(rec.week_start) + ". " : ""}Estimates are fine, and you
        can save and finish later.
      </p>
      <div className="split">
        <div className="card">
          <div className="row between">
            <div>
              <div className="stat">{pct}%</div>
              <p className="muted bar-text">
                {planned
                  ? `${done} of ${planned} tasks · ${level(pct)}`
                  : "Your score appears as you fill this in."}
              </p>
            </div>
            {rec && <Status k={STATUS[rec.status]} />}
          </div>
          <div className="bar">
            <i style={{ width: Math.min(pct, 100) + "%" }} />
          </div>
          <div className="fields">
            <div>
              <label htmlFor="h">Hours worked</label>
              <input
                id="h"
                type="number"
                min="0"
                step="0.5"
                disabled={!open}
                value={f.hours}
                onChange={n("hours")}
              />
            </div>
            <div>
              <label htmlFor="a">Tasks assigned</label>
              <input
                id="a"
                type="number"
                min="1"
                disabled={!open}
                value={f.tasks_assigned}
                onChange={n("tasks_assigned")}
              />
            </div>
            <div>
              <label htmlFor="c">Tasks completed</label>
              <input
                id="c"
                type="number"
                min="0"
                disabled={!open}
                value={f.tasks_completed}
                onChange={n("tasks_completed")}
              />
            </div>
          </div>
          <label htmlFor="nt">Notes (optional)</label>
          <textarea
            id="nt"
            disabled={!open}
            value={f.notes}
            onChange={n("notes")}
            placeholder="Anything your manager should know?"
          />
          {err && (
            <p className="err" role="alert">
              {err}
            </p>
          )}
          {msg && (
            <p className="ok" role="status">
              {msg}
            </p>
          )}
          {open && (
            <div className="row actions">
              <button className="btn" onClick={() => save("submitted")}>
                Send for review
              </button>
              <button className="btn sec" onClick={() => save("draft")}>
                Save for later
              </button>
              {rec && (
                <button className="link" onClick={remove}>
                  Delete draft
                </button>
              )}
            </div>
          )}
        </div>
        <aside className="card">
          <h3>Score = completed ÷ assigned</h3>
          <p className="muted">16 of 20 tasks is 80%.</p>
          <ul className="levels">
            <li>
              <span>Excellent</span>
              <span className="muted">90% and up</span>
            </li>
            <li>
              <span>Good</span>
              <span className="muted">75% and up</span>
            </li>
            <li>
              <span>Fair</span>
              <span className="muted">50% and up</span>
            </li>
            <li>
              <span>Needs support</span>
              <span className="muted">under 50%</span>
            </li>
          </ul>
        </aside>
      </div>
    </>
  );
}

export function MyRecords() {
  const list = useList("/records", "week", "desc");
  const cols = [
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
  ];
  const chart = (list.rows || [])
    .filter((r) => r.status !== "draft")
    .sort((a, b) => a.week_start.localeCompare(b.week_start))
    .slice(-8)
    .map((r) => ({ label: shortDate(r.week_start), rate: +r.rate }));
  return (
    <>
      <h1>Your weekly reports</h1>
      <div className="card">
        <SearchBox
          list={list}
          label="Search your reports"
          hint="Search by status or week (e.g. approved, 2026-11)"
        />
        <SortTable
          cols={cols}
          list={list}
          empty="You have no reports yet. Start with My Week."
        />
      </div>
      <div className="card">
        <h3>Score by week</h3>
        <Trend data={chart} />
      </div>
    </>
  );
}
