import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

// ---------- icons (small inline SVGs; always paired with text, so they are decorative) ----------
const PATHS = {
  check: "M4 10.5l4 4 8-9",
  clock: "M10 5.5V10l3 2M10 2.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15z",
  dash: "M5 10h10",
  alert: "M10 6v5M10 14.2v.1M10 2.5l8 14H2z",
  info: "M10 9v5M10 6v.1M10 2.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15z",
  close: "M5 5l10 10M15 5L5 15",
};
export const Icon = ({ name, size = 16 }) => (
  <svg
    className="icon"
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d={PATHS[name]} />
  </svg>
);

export const Logo = ({ size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    aria-hidden="true"
    focusable="false"
  >
    <rect width="28" height="28" rx="7" fill="#fff" fillOpacity="0.14" />
    <rect x="6" y="15" width="4" height="7" rx="1" fill="#fff" />
    <rect x="12" y="10" width="4" height="12" rx="1" fill="#6fc0c0" />
    <rect x="18" y="6" width="4" height="16" rx="1" fill="#e8741c" />
  </svg>
);

// Same brand block in the sidebar and on the sign-in page
export const Brand = ({ big }) => (
  <div className={"brand" + (big ? " big" : "")}>
    <Logo size={big ? 40 : 28} />
    <div>
      <span className="brand-name">EPTS</span>
      <small>Employee Productivity Tracking System</small>
    </div>
  </div>
);

// ---------- loading, error ----------
export const Spinner = () => <span className="spin" aria-hidden="true" />;

export function Loading({ label = "Loading…" }) {
  return (
    <p className="loading" role="status">
      <Spinner />
      {label}
    </p>
  );
}

export function ErrorBox({ message, onRetry, title = "We could not load this" }) {
  return (
    <div className="errbox" role="alert">
      <Icon name="alert" size={20} />
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
        {onRetry && (
          <button type="button" className="btn sec sm" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

// Inline message under a form (kept next to the buttons the person just pressed)
export const FormMsg = ({ err, ok }) =>
  err ? (
    <p className="err" role="alert">
      <Icon name="alert" />
      {err}
    </p>
  ) : ok ? (
    <p className="ok" role="status">
      <Icon name="check" />
      {ok}
    </p>
  ) : null;

// A button that shows progress and ignores clicks while its request runs
export function Btn({
  kind = "",
  busy,
  busyText,
  disabled,
  className = "",
  children,
  ...rest
}) {
  return (
    <button
      type="button"
      {...rest}
      className={`btn ${kind} ${className}`.trim()}
      disabled={busy || disabled}
      aria-busy={busy || undefined}
    >
      {busy && <Spinner />}
      {busy && busyText ? busyText : children}
    </button>
  );
}

// Loads data once, and again when reload() is called. Never stays on "loading" after a failure.
export function useLoad(fn, deps = []) {
  const [s, setS] = useState({ data: undefined, error: "", loading: true });
  const run = useCallback(() => {
    setS((p) => ({ ...p, loading: true, error: "" }));
    return fn().then(
      (data) => setS({ data, error: "", loading: false }),
      (e) => setS((p) => ({ data: p.data, error: e.message, loading: false })),
    );
  }, deps);
  useEffect(() => {
    run();
  }, [run]);
  return { ...s, reload: run };
}

// ---------- toasts: one place and one style for every success or error message ----------
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const id = useRef(0);
  const drop = (i) => setList((l) => l.filter((t) => t.id !== i));
  const push = useCallback((kind, text) => {
    const i = ++id.current;
    setList((l) => [...l.slice(-3), { id: i, kind, text }]);
    setTimeout(() => drop(i), kind === "err" ? 9000 : 5000);
  }, []);
  const api = useRef({
    ok: (t) => push("ok", t),
    err: (t) => push("err", t),
  }).current;
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toasts">
        {list.map((t) => (
          <div
            key={t.id}
            className={"toast " + t.kind}
            role={t.kind === "err" ? "alert" : "status"}
          >
            <Icon name={t.kind === "err" ? "alert" : "check"} size={18} />
            <span>{t.text}</span>
            <button
              type="button"
              className="toast-x"
              aria-label="Dismiss message"
              onClick={() => drop(t.id)}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- confirmation dialog (native <dialog>: focus stays inside, Esc cancels) ----------
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = "Confirm",
  busyText = "Working…",
  danger,
  busy,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // start on the safe choice (Cancel), not the destructive one
      d.querySelector("[data-autofocus]")?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dlg-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
    >
      {open && (
        <div className="dialog-body">
          <h2 id="dlg-title">{title}</h2>
          <div className="dialog-text">{children}</div>
          <div className="row actions">
            <Btn
              kind={danger ? "danger" : ""}
              busy={busy}
              busyText={busyText}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Btn>
            <button
              type="button"
              className="btn sec"
              onClick={onCancel}
              disabled={busy}
              data-autofocus
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
