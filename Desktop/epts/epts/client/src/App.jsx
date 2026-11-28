import { useEffect, useRef, useState } from "react";
import { api, setToken } from "./api";
import { Brand, ErrorBox, Loading, ToastProvider } from "./components/ui";
import Auth, { NameSetup } from "./pages/Auth";
import { MyRecords, MyWeek } from "./pages/Employee";
import { Overview, People, WeeklyRecords } from "./pages/Manager";

const NAV = {
  manager: [
    ["overview", "Overview", Overview],
    ["people", "People", People],
    ["records", "Weekly Records", WeeklyRecords],
  ],
  employee: [
    ["week", "My Week", MyWeek],
    ["mine", "My Records", MyRecords],
  ],
};

export default function App() {
  const [user, setUser] = useState(null),
    [session, setSession] = useState("checking"), // checking | ready | failed
    [failMsg, setFailMsg] = useState(""),
    [page, setPage] = useState(""),
    main = useRef(null);
  const enter = (u) => {
    setUser(u);
    setPage(NAV[u.role][0][0]);
  };
  const check = () => {
    // No saved sign-in: go straight to the sign-in page, there is nothing to check
    if (!localStorage.getItem("epts-token")) return setSession("ready");
    setSession("checking");
    api("/me")
      .then(enter)
      .catch((e) => {
        // 401/403 means "not signed in": show the sign-in page. Anything else is a real failure.
        if (e.status === 401 || e.status === 403) {
          setToken("");
        } else {
          setFailMsg(e.message);
          return setSession("failed");
        }
      })
      .then(() => setSession((s) => (s === "failed" ? s : "ready")));
  };
  useEffect(check, []);
  const out = () => {
    setToken("");
    setUser(null);
  };
  const go = (k) => {
    setPage(k);
    // move keyboard and screen reader focus to the new page
    setTimeout(() => main.current && main.current.focus(), 0);
  };

  if (session !== "ready")
    return (
      <div className="splash">
        <Brand big />
        {session === "checking" ? (
          <Loading label="Checking your session…" />
        ) : (
          <ErrorBox
            title="We could not check your session"
            message={failMsg}
            onRetry={check}
          />
        )}
      </div>
    );
  if (!user)
    return (
      <ToastProvider>
        <Auth onLogin={enter} />
      </ToastProvider>
    );
  if (user.role === "employee" && !user.full_name)
    return (
      <NameSetup
        onDone={(n) => setUser({ ...user, full_name: n })}
        onOut={out}
      />
    );
  const items = NAV[user.role],
    current = items.find((i) => i[0] === page) || items[0],
    Page = current[2];
  return (
    <ToastProvider>
      <a className="skip" href="#main">
        Skip to main content
      </a>
      <div className="app">
        <nav aria-label="Main">
          <Brand />
          <div className="links">
            {items.map(([k, t]) => (
              <a
                key={k}
                href={"#" + k}
                className={current[0] === k ? "on" : ""}
                aria-current={current[0] === k ? "page" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  go(k);
                }}
              >
                {t}
              </a>
            ))}
          </div>
          <div className="who">
            <b>{user.full_name || user.email}</b>
            <span>{user.role === "manager" ? "Manager" : "Employee"}</span>
            <button className="link" onClick={out}>
              Sign out
            </button>
          </div>
        </nav>
        <main id="main" ref={main} tabIndex={-1}>
          <div className="wrap">
            <Page key={current[0]} user={user} go={go} />
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
