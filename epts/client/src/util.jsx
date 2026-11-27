export const rate = (done, planned) =>
  planned ? Math.round((done / planned) * 1000) / 10 : 0;
export const level = (r) =>
  r >= 90
    ? "Excellent"
    : r >= 75
      ? "Good"
      : r >= 50
        ? "Fair"
        : "Needs support";
// [label, needsAction]. Only states that need someone to act get a pill.
export const STATUS = {
  draft: ["Not sent", false],
  submitted: ["Waiting for review", true],
  approved: ["Approved", false],
  pending: ["Waiting for approval", true],
  active: ["Active", false],
};
export const Status = ({ k }) =>
  k[1] ? (
    <span className="tag t-acc">{k[0]}</span>
  ) : (
    <span className="state">{k[0]}</span>
  );

const f = (d) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const shortDate = (iso) => f(new Date(iso.slice(0, 10) + "T00:00:00"));
export const weekText = (iso) => {
  const a = new Date(iso.slice(0, 10) + "T00:00:00"),
    b = new Date(a);
  b.setDate(a.getDate() + 6);
  return f(a) + " to " + f(b);
};
