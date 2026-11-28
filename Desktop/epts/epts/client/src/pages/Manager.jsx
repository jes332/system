import { useState } from "react";
import { api } from "../api";
import SortTable, { SearchBox, useList } from "../components/SortTable";
import Trend from "../components/Trend";
import {
  Btn,
  ConfirmDialog,
  ErrorBox,
  FormMsg,
  Loading,
  useLoad,
  useToast,
} from "../components/ui";
import { shortDate, STATUS, Status, weekText } from "../util";

const num = new Intl.NumberFormat("en-US");

export function Overview({ go }) {
  const o = useLoad(() => api("/overview")),
    // Reports sorted so the ones waiting for review come first; only used for the short list
    q = useLoad(() => api("/records?sort=status&dir=asc"));
  if (o.error && !o.data)
    return (
      <>
        <h1>Overview</h1>
        <ErrorBox message={o.error} onRetry={o.reload} title="We could not load the overview" />
      </>
    );
  if (!o.data)
    return (
      <>
        <h1>Overview</h1>
        <Loading label="Loading the overview…" />
      </>
    );
  const d = o.data,
    waiting = (q.data || []).filter((r) => r.status === "submitted");
  const kpis = [
    {
      main: true,
      n: d.waiting,
      label: "Reports to Review",
      sub: d.waiting ? "Submitted reports waiting for you" : "No reports are waiting",
      to: "records",
      action: "Review reports",
    },
    {
      n: d.requests,
      label: "Pending Accounts",
      sub: d.requests ? "Employees waiting for approval" : "No accounts are waiting",
      to: "people",
      action: "Review accounts",
    },
    {
      n: d.employees,
      label: "Active Employees",
      sub: "Approved and able to report",
      to: "people",
      action: "View people",
    },
  ];
  return (
    <>
      <h1>Overview</h1>
      <p className="muted lead">
        {d.team != null
          ? `Across all sent reports, your team completed ${d.team}% of assigned tasks (task completion rate).`
          : "No reports have been sent yet."}
      </p>
      <div className="kpis">
        {kpis.map((k) => (
          <section key={k.label} className={"kpi" + (k.main ? " main" : "")} aria-label={k.label}>
            <h2>{k.label}</h2>
            <p className="kpi-n">{num.format(k.n)}</p>
            <p className="kpi-sub">{k.sub}</p>
            <button
              type="button"
              className={k.main && k.n ? "btn sm" : "btn sec sm"}
              onClick={() => go(k.to)}
            >
              {k.action}
            </button>
          </section>
        ))}
      </div>
      <section className="card" aria-labelledby="trend-h">
        <h2 id="trend-h" className="cardh">
          Team task completion rate by week
        </h2>
        <Trend
          caption="Team task completion rate by week"
          data={d.trend.map((t) => ({
            label: shortDate(t.week_start),
            rate: +t.rate,
          }))}
        />
      </section>
      <section className="card" aria-labelledby="wait-h">
        <div className="row between">
          <h2 id="wait-h" className="cardh">
            Waiting for your review
          </h2>
          {waiting.length > 0 && (
            <button type="button" className="link" onClick={() => go("records")}>
              Open Weekly Records
            </button>
          )}
        </div>
        {q.error ? (
          <ErrorBox message={q.error} onRetry={q.reload} title="We could not load this list" />
        ) : q.loading && !q.data ? (
          <Loading />
        ) : waiting.length === 0 ? (
          <p className="muted">You are all caught up. No reports are waiting.</p>
        ) : (
          <ul className="queue">
            {waiting.slice(0, 5).map((r) => (
              <li key={r.id}>
                <span>
                  <strong>{r.person}</strong>
                  <span className="muted"> · {weekText(r.week_start)}</span>
                </span>
                <span className="muted">
                  {r.tasks_completed} of {r.tasks_assigned} tasks · {r.rate}%
                </span>
              </li>
            ))}
          </ul>
        )}
        {waiting.length > 5 && (
          <p className="hint">Showing 5 of {waiting.length}. The rest are in Weekly Records.</p>
        )}
      </section>
    </>
  );
}

export function People() {
  const list = useList("/users", "status", "asc"),
    toast = useToast();
  // edit = the row being edited (null = no form shown), form = what is typed in it
  const [edit, setEdit] = useState(null),
    [form, setForm] = useState({ full_name: "", email: "", status: "active" }),
    [err, setErr] = useState(""),
    [busy, setBusy] = useState(""), // what is running: "approve-5", "save", "delete"
    [del, setDel] = useState(null); // the row waiting for delete confirmation
  const name = (r) => r.full_name || r.email;

  const approve = async (r) => {
    setBusy("approve-" + r.id);
    try {
      await api(`/users/${r.id}/approve`, "PUT");
      toast.ok(`${name(r)} approved. They can sign in now.`);
    } catch (x) {
      toast.err(x.message);
    } finally {
      setBusy("");
      list.load();
    }
  };
  // EDIT: open the form filled with the row that was clicked in the search results
  const openEdit = (r) => {
    setEdit(r);
    setForm({ full_name: r.full_name || "", email: r.email, status: r.status });
    setErr("");
  };
  const up = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    setErr("");
  };
  // UPDATE: send the form to the server, then read the list again (the search word stays)
  const save = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy("save");
    try {
      await api(`/users/${edit.id}`, "PUT", form);
      toast.ok(`Saved changes to ${form.full_name || form.email}.`);
      setEdit(null);
      list.load();
    } catch (x) {
      setErr(x.message); // the form stays open with what was typed
    } finally {
      setBusy("");
    }
  };
  // DELETE: ask first (dialog), then remove the row and read the list again
  const remove = async () => {
    setBusy("delete");
    try {
      await api(`/users/${del.id}`, "DELETE");
      if (edit && edit.id === del.id) setEdit(null);
      toast.ok(`${del.status === "pending" ? "Declined" : "Deleted"} ${name(del)}.`);
    } catch (x) {
      toast.err(x.message);
    } finally {
      setBusy("");
      setDel(null);
      list.load();
    }
  };
  const cols = [
    { label: "Name", sort: "name", cell: (r) => r.full_name || "Not added yet" },
    { label: "Email", sort: "email", key: "email" },
    { label: "Status", sort: "status", cell: (r) => <Status k={STATUS[r.status]} /> },
    { label: "Joined", sort: "joined", cell: (r) => shortDate(r.created_at) },
    {
      label: "Actions",
      hide: true,
      cell: (r) => (
        <span className="rowact">
          {r.status === "pending" && (
            <Btn
              kind="sm"
              busy={busy === "approve-" + r.id}
              busyText="Approving…"
              disabled={!!busy}
              aria-label={`Approve ${name(r)}`}
              onClick={() => approve(r)}
            >
              Approve
            </Btn>
          )}
          <Btn
            kind="sec sm"
            disabled={!!busy}
            aria-label={`Edit ${name(r)}`}
            onClick={() => openEdit(r)}
          >
            Edit
          </Btn>
          <Btn
            kind="danger sm"
            disabled={!!busy}
            aria-label={`${r.status === "pending" ? "Decline" : "Delete"} ${name(r)}`}
            onClick={() => setDel(r)}
          >
            {r.status === "pending" ? "Decline" : "Delete"}
          </Btn>
        </span>
      ),
    },
  ];
  return (
    <>
      <h1>Approve accounts and manage your team</h1>
      <p className="muted lead">
        Approve new employees so they can sign in, and edit or remove accounts.
      </p>
      <section className="card" aria-label="Employees">
        <SearchBox
          list={list}
          label="Search employees"
          hint="Search by name, email, or status"
        />
        {edit && (
          <form className="editpanel" onSubmit={save} aria-labelledby="edit-h">
            <h2 id="edit-h">Edit {name(edit)}</h2>
            <div className="fields">
              <div className="field">
                <label htmlFor="ed-name">
                  Full name<span className="opt"> (optional)</span>
                </label>
                <input
                  id="ed-name"
                  value={form.full_name}
                  onChange={up("full_name")}
                  placeholder="Not added yet"
                  autoFocus
                />
              </div>
              <div className="field">
                <label htmlFor="ed-email">
                  Work email<span className="req"> (required)</span>
                </label>
                <input
                  id="ed-email"
                  type="email"
                  value={form.email}
                  onChange={up("email")}
                  placeholder="name@work.com"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="ed-status">Status</label>
                <select id="ed-status" value={form.status} onChange={up("status")}>
                  <option value="active">Active</option>
                  <option value="pending">Waiting for approval</option>
                </select>
              </div>
            </div>
            <FormMsg err={err} />
            <div className="row actions">
              <Btn type="submit" busy={busy === "save"} busyText="Saving…">
                Update
              </Btn>
              <Btn kind="sec" disabled={busy === "save"} onClick={() => setEdit(null)}>
                Cancel
              </Btn>
            </div>
          </form>
        )}
        <SortTable
          cols={cols}
          list={list}
          caption="Employees"
          empty="No employees have registered yet."
        />
      </section>
      <ConfirmDialog
        open={!!del}
        title={del && del.status === "pending" ? "Decline this request?" : "Delete this employee?"}
        confirmLabel={del && del.status === "pending" ? "Decline request" : "Delete employee"}
        busyText="Deleting…"
        danger
        busy={busy === "delete"}
        onConfirm={remove}
        onCancel={() => setDel(null)}
      >
        {del && (
          <p>
            {del.status === "pending"
              ? `${name(del)} will not be able to sign in.`
              : `${name(del)} and all of their weekly reports will be deleted. This cannot be undone.`}
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}

export function WeeklyRecords() {
  const list = useList("/records", "status", "asc"), // "waiting for review" sorts first
    toast = useToast(),
    [busy, setBusy] = useState(0);
  const approve = async (r) => {
    setBusy(r.id);
    try {
      await api(`/records/${r.id}/approve`, "PUT");
      toast.ok(`Approved ${r.person}'s report for ${weekText(r.week_start)}.`);
    } catch (x) {
      toast.err(x.message);
    } finally {
      setBusy(0);
      list.load();
    }
  };
  const waiting = (list.rows || []).filter((r) => r.status === "submitted").length;
  const cols = [
    { label: "Employee", sort: "person", key: "person" },
    { label: "Week", sort: "week", cell: (r) => weekText(r.week_start) },
    { label: "Hours", sort: "hours", num: true, cell: (r) => +r.hours },
    { label: "Assigned", sort: "assigned", num: true, key: "tasks_assigned" },
    { label: "Completed", sort: "completed", num: true, key: "tasks_completed" },
    { label: "Task completion rate", sort: "rate", num: true, cell: (r) => r.rate + "%" },
    { label: "Status", sort: "status", cell: (r) => <Status k={STATUS[r.status]} /> },
    {
      label: "Notes",
      cell: (r) =>
        r.notes ? (
          <details className="note">
            <summary>Read note</summary>
            <p>{r.notes}</p>
          </details>
        ) : (
          <span className="muted">None</span>
        ),
    },
    {
      label: "Review",
      hide: true,
      cell: (r) =>
        r.status === "submitted" && (
          <Btn
            kind="sm"
            busy={busy === r.id}
            busyText="Approving…"
            disabled={!!busy}
            aria-label={`Approve report from ${r.person} for ${weekText(r.week_start)}`}
            onClick={() => approve(r)}
          >
            Approve
          </Btn>
        ),
    },
  ];
  return (
    <>
      <h1>Review reports from your team</h1>
      <p className="muted lead">
        Reports waiting for review are listed first and highlighted.
        {list.rows && !list.term && waiting > 0 && (
          <strong> {waiting} {waiting === 1 ? "report is" : "reports are"} waiting.</strong>
        )}
      </p>
      <section className="card" aria-label="Weekly reports">
        <SearchBox
          list={list}
          label="Search reports"
          hint="Search by employee, status, or week (e.g. 2026-11)"
        />
        <SortTable
          cols={cols}
          list={list}
          caption="Weekly reports from your team"
          empty="No reports have been sent yet."
          rowClass={(r) => (r.status === "submitted" ? "attn" : undefined)}
        />
      </section>
    </>
  );
}
