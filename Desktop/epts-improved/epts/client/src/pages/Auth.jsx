import { useState } from "react";
import { api, setToken } from "../api";
import { Brand, Btn, FormMsg, IconBtn } from "../components/ui";

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("in"),
    [f, setF] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [err, setErr] = useState(""),
    [ok, setOk] = useState("");
  const up = (k) => (e) => {
    setF({ ...f, [k]: e.target.value });
    setErr("");
  };
  const flip = () => {
    setMode(mode === "in" ? "up" : "in");
    setErr("");
    setOk("");
  };
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setErr("");
    setOk("");
    setBusy(true);
    try {
      if (mode === "up") {
        const j = await api("/register", "POST", f);
        setOk(j.message);
        setMode("in");
        setF({ email: f.email, password: "" });
        setBusy(false);
      } else {
        const j = await api("/login", "POST", f);
        setToken(j.token);
        onLogin(j.user);
      }
    } catch (x) {
      setErr(x.message);
      setBusy(false);
    }
  };
  return (
    <div className="auth">
      <section className="auth-side">
        <Brand big />
        <p className="auth-lead">Weekly reports in minutes, reviewed in one place.</p>
        <ul>
          <li>Employees report their week in a few minutes.</li>
          <li>Managers review and approve each report.</li>
          <li>Everyone can see progress week by week.</li>
        </ul>
      </section>
      <section className="auth-main">
        <form className="card" onSubmit={submit}>
          <h1>
            {mode === "in" ? "Sign in to EPTS" : "Create your EPTS account"}
          </h1>
          {mode === "up" && (
            <p className="muted">
              Your manager will approve your account before you can sign in.
            </p>
          )}
          <FormMsg ok={ok} />
          <label htmlFor="em">Work email</label>
          <input
            id="em"
            type="email"
            autoComplete="off"
            placeholder="name@work.com"
            value={f.email}
            onChange={up("email")}
            required
          />
          <label htmlFor="pw">Password</label>
          <div className="pwrow">
            <input
              id="pw"
              placeholder={mode === "in" ? "Enter your password" : "At least 8 characters"}
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={f.password}
              onChange={up("password")}
              required
            />
            <IconBtn
              icon={show ? "eyeoff" : "eye"}
              label={show ? "Hide password" : "Show password"}
              aria-pressed={show}
              onClick={() => setShow(!show)}
            />
          </div>
          {mode === "up" && <p className="hint">Use at least 8 characters.</p>}
          <FormMsg err={err} />
          <Btn
            type="submit"
            className="full"
            busy={busy}
            busyText={mode === "in" ? "Signing in…" : "Creating account…"}
          >
            {mode === "in" ? "Sign in" : "Create account"}
          </Btn>
          <p className="switch">
            {mode === "in" ? "New employee? " : "Already have an account? "}
            <button type="button" className="link" onClick={flip}>
              {mode === "in" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}

export function NameSetup({ onDone, onOut }) {
  const [n, setN] = useState(""),
    [busy, setBusy] = useState(false),
    [err, setErr] = useState("");
  const save = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const j = await api("/me", "PUT", { full_name: n });
      onDone(j.full_name);
    } catch (x) {
      setErr(x.message);
      setBusy(false);
    }
  };
  return (
    <div className="auth-main solo">
      <form className="card" onSubmit={save}>
        <h1>What should your manager call you?</h1>
        <p className="muted">
          Your manager will see this name next to your reports.
        </p>
        <label htmlFor="nm">Full name</label>
        <input
          id="nm"
          value={n}
          onChange={(e) => {
            setN(e.target.value);
            setErr("");
          }}
          autoFocus
        />
        <FormMsg err={err} />
        <Btn type="submit" className="full" busy={busy} busyText="Saving…">
          Continue
        </Btn>
        <p className="switch">
          <button type="button" className="link" onClick={onOut}>
            Sign out
          </button>
        </p>
      </form>
    </div>
  );
}
