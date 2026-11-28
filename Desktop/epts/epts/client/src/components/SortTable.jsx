import { useEffect, useId, useRef, useState } from "react";
import { api } from "../api";
import { ErrorBox, Loading } from "./ui";

// Reads a list from the server. Clicking a column header changes sort/dir, and typing in the
// search box changes `search`; either one reads again (WHERE ... LIKE and ORDER BY run in MySQL).
export function useList(path, sort, dir = "asc") {
  const [s, setS] = useState({ sort, dir }),
    [search, setSearch] = useState(""),
    [term, setTerm] = useState(""),
    [rows, setRows] = useState(null),
    [err, setErr] = useState(""),
    latest = useRef(0);
  // wait 300 ms after the last keystroke so we do not ask the server for every letter
  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const load = () => {
    const mine = ++latest.current; // ignore answers that arrive after a newer request
    return api(
      `${path}?sort=${s.sort}&dir=${s.dir}&search=${encodeURIComponent(term)}`,
    ).then(
      (d) => {
        if (mine !== latest.current) return;
        setErr("");
        setRows(d);
      },
      (e) => {
        if (mine === latest.current) setErr(e.message);
      },
    );
  };
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
  const id = useId();
  return (
    <div className="searchbar">
      <div className="searchfield">
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          type="search"
          placeholder={hint}
          value={list.search}
          onChange={(e) => list.setSearch(e.target.value)}
        />
      </div>
      <span className="muted" role="status">
        {list.term && Array.isArray(list.rows)
          ? `${list.rows.length} ${list.rows.length === 1 ? "result" : "results"} for “${list.term}”`
          : ""}
      </span>
    </div>
  );
}

export default function SortTable({
  cols,
  list,
  caption,
  empty = "Nothing to show yet.",
  rowClass,
}) {
  const { rows, err, sort, dir, onSort } = list;
  if (err && !rows)
    return <ErrorBox message={err} onRetry={list.load} title="We could not load the list" />;
  if (!rows) return <Loading />;
  if (!rows.length)
    return (
      <div className="empty">
        <p>{list.term ? `No results for “${list.term}”.` : empty}</p>
        {list.term && (
          <button type="button" className="btn sec sm" onClick={() => list.setSearch("")}>
            Clear search
          </button>
        )}
      </div>
    );
  return (
    <>
      {err && <ErrorBox message={err} onRetry={list.load} title="The list may be out of date" />}
      <div className="tablewrap">
        <table>
          {caption && <caption className="sr">{caption}</caption>}
          <thead>
            <tr>
              {cols.map((c) => (
                <th
                  key={c.label}
                  scope="col"
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
                    <button type="button" className="th" onClick={() => onSort(c.sort)}>
                      {c.label}
                      <i aria-hidden="true">
                        {sort === c.sort ? (dir === "asc" ? "▲" : "▼") : "↕"}
                      </i>
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
              <tr key={r.id} className={rowClass ? rowClass(r) : undefined}>
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
    </>
  );
}
