import { useEffect, useState } from "react";
import { api, setToken } from "./api";
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
    [ready, setReady] = useState(false),
    [page, setPage] = useState("");
  const enter = (u) => {
    setUser(u);
    setPage(NAV[u.role][0][0]);
  };
  useEffect(() => {
    api("/me")
      .then(enter)
      .catch(() => setToken(""))
      .finally(() => setReady(true));
  }, []);
  const out = () => {
    setToken("");
    setUser(null);
  };
  if (!ready) return null;
  if (!user) return <Auth onLogin={enter} />;
  if (user.role === "employee" && !user.full_name)
    return (
      <NameSetup
        onDone={(n) => setUser({ ...user, full_name: n })}
        onOut={out}
      />
    );
  const items = NAV[user.role],
    Page = (items.find((i) => i[0] === page) || items[0])[2];
  return (
    <div className="app">
      <nav>
        <div className="brand">EPTS</div>
        <div className="links">
          {items.map(([k, t]) => (
            <button
              key={k}
              className={page === k ? "on" : ""}
              onClick={() => setPage(k)}
            >
              {t}
            </button>
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
      <main>
        <div className="wrap">
          <Page user={user} go={setPage} />
        </div>
      </main>
    </div>
  );
}
