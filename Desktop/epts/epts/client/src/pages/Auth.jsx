import { useState } from "react";
import { api, setToken } from "../api";

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState("in"),
    [f, setF] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false),
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
    setErr("");
    setOk("");
    try {
      if (mode === "up") {
        const j = await api("/register", "POST", f);
        setOk(j.message);
        setMode("in");
        setF({ email: f.email, password: "" });
      } else {
        const j = await api("/login", "POST", f);
        setToken(j.token);
        onLogin(j.user);
      }
    } catch (x) {
      setErr(x.message);
    }
  };
  return (
    <div className="auth">
      <section className="auth-side">
        <div className="brand big">
          EPTS<small>Employee Productivity Tracking System</small>
        </div>
        <h2>Weekly reports in minutes, reviewed in one place.</h2>
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
          {ok && (
            <p className="ok" role="status">
              {ok}
            </p>
          )}
          <label htmlFor="em">Work email</label>
          <input
            id="em"
            type="email"
            autoComplete="username"
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
              autoComplete={mode === "in" ? "current-password" : "new-password"}
              value={f.password}
              onChange={up("password")}
              required
            />
            <button
              type="button"
              className="link"
              onClick={() => setShow(!show)}
            >
              {show ? "Hide" : "Show"}
            </button>
          </div>
          {mode === "up" && <p className="hint">Use at least 8 characters.</p>}
          {err && (
            <p className="err" role="alert">
              {err}
            </p>
          )}
          <button className="btn full">
            {mode === "in" ? "Sign in" : "Create account"}
          </button>
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
    [err, setErr] = useState("");
  const save = async (e) => {
    e.preventDefault();
    try {
      const j = await api("/me", "PUT", { full_name: n });
      onDone(j.full_name);
    } catch (x) {
      setErr(x.message);
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
        {err && (
          <p className="err" role="alert">
            {err}
          </p>
        )}
        <button className="btn full">Continue</button>
        <p className="switch">
          <button type="button" className="link" onClick={onOut}>
            Sign out
          </button>
        </p>
      </form>
    </div>
  );
}
