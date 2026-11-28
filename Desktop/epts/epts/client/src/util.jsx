import { Icon } from "./components/ui";

// Task completion rate = tasks completed / tasks assigned x 100.
// It measures how many assigned tasks were finished. It does not include hours worked,
// task difficulty, task importance, or the quality of the work.
export const rate = (done, planned) =>
  planned ? Math.round((done / planned) * 1000) / 10 : 0;

// tone decides the color; every status also has an icon and a text label (never color alone)
export const STATUS = {
  draft: { label: "Not sent", tone: "neutral", icon: "dash" },
  submitted: { label: "Waiting for review", tone: "warn", icon: "clock" },
  approved: { label: "Approved", tone: "ok", icon: "check" },
  pending: { label: "Waiting for approval", tone: "warn", icon: "clock" },
  active: { label: "Active", tone: "ok", icon: "check" },
};
export const Status = ({ k }) => (
  <span className={"tag t-" + k.tone}>
    <Icon name={k.icon} />
    {k.label}
  </span>
);

const f = (d) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const parse = (iso) => new Date(iso.slice(0, 10) + "T00:00:00");
export const shortDate = (iso) => f(parse(iso));
export const weekText = (iso) => {
  const a = parse(iso),
    b = new Date(a);
  b.setDate(a.getDate() + 6);
  return f(a) + " to " + f(b);
};
// Monday of this week as YYYY-MM-DD (same rule the server uses to file the report)
export const thisMonday = () => {
  const x = new Date(),
    p = (n) => String(n).padStart(2, "0");
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
};
