import { useEffect, useState } from "react";
import { api } from "../api";

// Reads a list from the server. Clicking a column header changes sort/dir, and typing in the
// search box changes `search`; either one reads again (WHERE ... LIKE and ORDER BY run in MySQL).
export function useList(path, sort, dir = "asc") {
  const [s, setS] = useState({ sort, dir }),
    [search, setSearch] = useState(""),
    [term, setTerm] = useState(""),
    [rows, setRows] = useState(null),
    [err, setErr] = useState("");
  // wait 300 ms after the last keystroke so we do not ask the server for every letter
  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const load = () =>
    api(
      `${path}?sort=${s.sort}&dir=${s.dir}&search=${encodeURIComponent(term)}`,
    )
      .then((d) => {
        setErr("");
        setRows(d);
      })
      .catch((e) => setErr(e.message));
  useEffect(() => {
    load();
  }, [s.sort, s.dir, term]);
  const onSort = (k) =>
    setS((p) => ({
      sort: k,
      dir: p.sort === k && p.dir === "asc" ? "desc" : "asc",
    }));
  return {
    rows,
    err,
    load,
    sort: s.sort,
    dir: s.dir,
    onSort,
    search,
    setSearch,
    term,
  };
}

// The search box shown above a table
export function SearchBox({ list, label = "Search", hint }) {
  return (
    <div className="searchbar">
      <label htmlFor="search-box" className="sr">
        {label}
      </label>
      <input
        id="search-box"
        type="search"
        placeholder={hint}
        value={list.search}
        onChange={(e) => list.setSearch(e.target.value)}
      />
      {list.term && Array.isArray(list.rows) && (
        <span className="muted" role="status">
          {list.rows.length} {list.rows.length === 1 ? "result" : "results"} for “{list.term}”
        </span>
      )}
    </div>
  );
}

export default function SortTable({
  cols,
  list,
  empty = "Nothing to show yet.",
}) {
  const { rows, err, sort, dir, onSort } = list;
  if (err) return <p className="err">{err}</p>;
  if (!rows) return <p className="muted">Loading…</p>;
  if (!rows.length)
    return (
      <p className="muted">
        {list.term ? `No results for “${list.term}”.` : empty}
      </p>
    );
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            {cols.map((c) => (
              <th
                key={c.label}
                className={c.num ? "num" : undefined}
                aria-sort={
                  c.sort && sort === c.sort
                    ? dir === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                {c.sort ? (
                  <button className="th" onClick={() => onSort(c.sort)}>
                    {c.label}
                    <i>{sort === c.sort ? (dir === "asc" ? "▲" : "▼") : "↕"}</i>
                  </button>
                ) : c.hide ? (
                  <span className="sr">{c.label}</span>
                ) : (
                  c.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              {cols.map((c) => (
                <td
                  key={c.label}
                  className={c.num ? "num" : undefined}
                  data-label={c.hide ? "" : c.label}
                >
                  {c.cell ? c.cell(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
