import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import SortTable, { SearchBox, useList } from "../components/SortTable";
import Trend from "../components/Trend";
import {
  Btn,
  ConfirmDialog,
  ErrorBox,
  Icon,
  Loading,
  useLoad,
  useToast,
} from "../components/ui";
import { rate, shortDate, STATUS, Status, thisMonday, weekText } from "../util";

const EMPTY = { hours: "", tasks_assigned: "", tasks_completed: "", notes: "" };

// Same rules as the server (server/index.js check()). The server still checks everything again.
function validate(f) {
  const e = {},
    h = f.hours === "" ? NaN : Number(f.hours),
    a = f.tasks_assigned === "" ? NaN : Number(f.tasks_assigned),
    c = f.tasks_completed === "" ? NaN : Number(f.tasks_completed);
  if (f.hours === "") e.hours = "Enter the hours you worked this week.";
  else if (!Number.isFinite(h) || h < 0 || h > 168)
    e.hours = "Hours must be between 0 and 168.";
  else if (Math.round(h * 10) / 10 !== h)
    e.hours = "Use at most one decimal place, for example 37.5.";
  if (f.tasks_assigned === "") e.tasks_assigned = "Enter how many tasks were assigned.";
  else if (!Number.isInteger(a)) e.tasks_assigned = "Use a whole number.";
  else if (a < 1) e.tasks_assigned = "Tasks assigned must be at least 1.";
  if (f.tasks_completed === "") e.tasks_completed = "Enter how many tasks you completed.";
  else if (!Number.isInteger(c)) e.tasks_completed = "Use a whole number.";
  else if (c < 0) e.tasks_completed = "Tasks completed must be 0 or more.";
  else if (Number.isInteger(a) && a >= 1 && c > a)
    e.tasks_completed = `Tasks completed cannot be more than tasks assigned (${a}).`;
  return e;
}

// Blocks letters and signs in number fields (the browser lets e, +, - through)
const numKeys = (decimal) => (e) => {
  if (["e", "E", "+", "-"].includes(e.key) || (!decimal && e.key === ".")) e.preventDefault();
};

function Field({ id, label, required, hint, error, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        <span className={required ? "req" : "opt"}>
          {required ? " (required)" : " (optional)"}
        </span>
      </label>
      {children({
        "aria-invalid": error ? "true" : undefined,
        "aria-describedby": `${id}-hint${error ? ` ${id}-err` : ""}`,
      })}
      <p className="hint" id={`${id}-hint`}>
        {hint}
      </p>
      {error && (
        <p className="fielderr" id={`${id}-err`}>
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}
    </div>
  );
}

export function MyWeek({ user }) {
  const toast = useToast(),
    [rec, setRec] = useState(undefined),
    [week, setWeek] = useState(thisMonday()),
    [loadErr, setLoadErr] = useState(""),
    [f, setF] = useState(EMPTY),
    [touched, setTouched] = useState({}),
    [busy, setBusy] = useState(""), // "", "submitted", "draft" or "delete"
    [confirm, setConfirm] = useState(false),
    box = useRef(null);
  const fetchCurrent = () =>
    api("/records/current").then(({ week_start, record: x }) => {
      // The server decides the week: this week, or next week once this week is approved
      setWeek(week_start);
      setRec(x);
      setF(
        x
          ? {
              hours: x.hours,
              tasks_assigned: x.tasks_assigned,
              tasks_completed: x.tasks_completed,
              notes: x.notes || "",
            }
          : EMPTY,
      );
      setTouched({});
      return x;
    });
  const load = () => {
    setLoadErr("");
    fetchCurrent().catch((e) => setLoadErr(e.message));
  };
  useEffect(load, []);
  if (loadErr && rec === undefined)
    return (
      <>
        <h1>Report your week</h1>
        <ErrorBox message={loadErr} onRetry={load} title="We could not load your report" />
      </>
    );
  if (rec === undefined)
    return (
      <>
        <h1>Report your week</h1>
        <Loading label="Loading your report…" />
      </>
    );

  const open = !rec || rec.status === "draft",
    errors = validate(f),
    shown = (k) => (touched[k] ? errors[k] : undefined),
    done = +f.tasks_completed || 0,
    planned = +f.tasks_assigned || 0,
    ok = planned >= 1 && done >= 0 && done <= planned, // only show a rate for numbers that make sense
    pct = ok ? rate(done, planned) : 0,
    nextWeek = week.slice(0, 10) > thisMonday();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  const save = async (status) => {
    const bad = Object.keys(errors);
    if (bad.length) {
      setTouched({ hours: true, tasks_assigned: true, tasks_completed: true });
      const first = { hours: "h", tasks_assigned: "a", tasks_completed: "c" }[bad[0]];
      box.current?.querySelector("#" + first)?.focus();
      toast.err("Please fix the highlighted fields first.");
      return;
    }
    setBusy(status);
    try {
      await api(rec ? `/records/${rec.id}` : "/records", rec ? "PUT" : "POST", {
        ...f,
        status,
      });
      // Read the saved report back so the status shown is the one the server holds
      await fetchCurrent();
      toast.ok(
        status === "submitted"
          ? "Report sent to your manager for review."
          : "Draft saved. You can finish it later.",
      );
    } catch (x) {
      // The typed values stay in the form
      toast.err(x.message);
    } finally {
      setBusy("");
    }
  };
  const remove = async () => {
    setBusy("delete");
    try {
      await api(`/records/${rec.id}`, "DELETE");
      setRec(null);
      setF(EMPTY);
      setTouched({});
      setConfirm(false);
      toast.ok("Draft deleted.");
    } catch (x) {
      setConfirm(false);
      toast.err(x.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <h1>{user.full_name.split(" ")[0]}, report your week</h1>
      <p className="weekrange">
        <span>Reporting week</span>
        <strong>{weekText(week)}</strong>
      </p>
      {nextWeek && (
        <p className="notice" role="status">
          <Icon name="check" />
          Your report for this week was approved. You can now report next week.
        </p>
      )}
      <p className="muted lead">
        Estimates are fine, and you can save and finish later. Fields marked required must be
        filled in before you save or send.
      </p>
      <div className="split">
        <section className="card" aria-labelledby="rate-h" ref={box}>
          <div className="row between">
            <div>
              <h2 id="rate-h" className="cardh">
                Weekly Task Completion Rate
              </h2>
              <div className="stat">{ok ? pct + "%" : "–"}</div>
              <p className="muted bar-text">
                {!planned
                  ? "The rate appears as you fill this in."
                  : ok
                    ? `${done} of ${planned} assigned tasks completed`
                    : "Check the task numbers: completed cannot be more than assigned."}
              </p>
            </div>
            {rec && <Status k={STATUS[rec.status]} plain />}
          </div>
          <div
            className="bar"
            role="progressbar"
            aria-label="Weekly task completion rate"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={Math.min(pct, 100)}
          >
            <i style={{ width: Math.min(pct, 100) + "%" }} />
          </div>
          {!open && (
            <p className="hint">
              {rec.status === "approved"
                ? nextWeek
                  ? "Next week's report is already approved. You are all caught up."
                  : "This report was approved by your manager."
                : "This report was sent and is waiting for your manager. It can no longer be changed."}
            </p>
          )}
          <div className="fields">
            <Field
              id="h"
              label="Hours worked"
              required
              hint="Total for the week, 0 to 168."
              error={shown("hours")}
            >
              {(a) => (
                <input
                  {...a}
                  id="h"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="168"
                  step="0.5"
                  disabled={!open}
                  value={f.hours}
                  onChange={set("hours")}
                  onBlur={blur("hours")}
                  onKeyDown={numKeys(true)}
                />
              )}
            </Field>
            <Field
              id="a"
              label="Tasks assigned"
              required
              hint="Whole number, at least 1."
              error={shown("tasks_assigned")}
            >
              {(a) => (
                <input
                  {...a}
                  id="a"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  disabled={!open}
                  value={f.tasks_assigned}
                  onChange={set("tasks_assigned")}
                  onBlur={blur("tasks_assigned")}
                  onKeyDown={numKeys(false)}
                />
              )}
            </Field>
            <Field
              id="c"
              label="Tasks completed"
              required
              hint="Whole number, not more than assigned."
              error={shown("tasks_completed")}
            >
              {(a) => (
                <input
                  {...a}
                  id="c"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  disabled={!open}
                  value={f.tasks_completed}
                  onChange={set("tasks_completed")}
                  onBlur={blur("tasks_completed")}
                  onKeyDown={numKeys(false)}
                />
              )}
            </Field>
          </div>
          <label htmlFor="nt">
            Notes<span className="opt"> (optional)</span>
          </label>
          <textarea
            id="nt"
            disabled={!open}
            value={f.notes}
            onChange={set("notes")}
            placeholder="Anything your manager should know?"
          />
          {open && (
            <div className="row actions">
              <Btn
                busy={busy === "submitted"}
                busyText="Sending…"
                disabled={!!busy}
                onClick={() => save("submitted")}
              >
                Send for review
              </Btn>
              <Btn
                kind="sec"
                busy={busy === "draft"}
                busyText="Saving…"
                disabled={!!busy}
                onClick={() => save("draft")}
              >
                Save for later
              </Btn>
              {rec && (
                <button
                  type="button"
                  className="link danger-link"
                  disabled={!!busy}
                  onClick={() => setConfirm(true)}
                >
                  Delete draft
                </button>
              )}
            </div>
          )}
        </section>
        <aside className="card" aria-labelledby="how-h">
          <h2 id="how-h" className="cardh">
            How the rate is calculated
          </h2>
          <p>
            <strong>Tasks completed ÷ tasks assigned × 100</strong>
          </p>
        </aside>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Delete this draft?"
        confirmLabel="Delete draft"
        busyText="Deleting…"
        danger
        busy={busy === "delete"}
        onConfirm={remove}
        onCancel={() => setConfirm(false)}
      >
        <p>
          The draft for {weekText(week)} will be removed. You can start a new report for this
          week afterwards.
        </p>
      </ConfirmDialog>
    </>
  );
}

export function MyRecords() {
  const list = useList("/records", "week", "desc"),
    // The chart reads its own list so searching or sorting the table does not change it
    all = useLoad(() => api("/records?sort=week&dir=asc"));
  const cols = [
    { label: "Week", sort: "week", cell: (r) => weekText(r.week_start) },
    { label: "Hours", sort: "hours", num: true, cell: (r) => +r.hours },
    { label: "Assigned", sort: "assigned", num: true, key: "tasks_assigned" },
    { label: "Completed", sort: "completed", num: true, key: "tasks_completed" },
    {
      label: "Task completion rate",
      sort: "rate",
      num: true,
      cell: (r) => r.rate + "%",
    },
    {
      label: "Status",
      sort: "status",
      cell: (r) => <Status k={STATUS[r.status]} plain />,
    },
  ];
  const chart = (all.data || [])
    .filter((r) => r.status !== "draft")
    .slice(-8)
    .map((r) => ({ label: shortDate(r.week_start), rate: +r.rate }));
  return (
    <>
      <h1>Your weekly reports</h1>
      <section className="card" aria-labelledby="hist-h">
        <h2 id="hist-h" className="cardh">
          Report history
        </h2>
        <SearchBox
          list={list}
          label="Search your reports"
          hint="Search by status or week (e.g. approved, 2026-11)"
        />
        <SortTable
          cols={cols}
          list={list}
          caption="Your weekly reports"
          empty="You have no reports yet. Start with My Week."
        />
      </section>
      <section className="card" aria-labelledby="trend-h">
        <h2 id="trend-h" className="cardh">
          Task completion rate by week
        </h2>
        {all.error ? (
          <ErrorBox message={all.error} onRetry={all.reload} title="We could not load the chart" />
        ) : all.loading && !all.data ? (
          <Loading label="Loading chart…" />
        ) : (
          <Trend data={chart} caption="Your task completion rate by week" />
        )}
      </section>
    </>
  );
}
