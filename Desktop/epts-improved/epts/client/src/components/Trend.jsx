// Line chart of task completion rate. data = [{ label, rate }] (rate is 0 to 100).
// The vertical scale is always 0% to 100%, so a chart never exaggerates small changes.
// A table with the same numbers sits under the chart for anyone who cannot use the picture.
const W = 560,
  H = 230,
  L = 48,
  R = 20,
  T = 20,
  B = 44;
const y = (v) => T + (1 - v / 100) * (H - T - B);

export default function Trend({ data, caption = "Task completion rate by week" }) {
  if (!data.length)
    return (
      <p className="muted">
        The chart appears once there are sent reports.
      </p>
    );
  const step = data.length > 1 ? (W - L - R) / (data.length - 1) : 0,
    xy = data.map((d, i) => [data.length > 1 ? L + i * step : (L + W - R) / 2, y(d.rate)]),
    // show every other date label when the points are crowded
    every = step && step < 56 ? 2 : 1;
  const summary = `${caption}. ${data.map((d) => `${d.label}: ${d.rate}%`).join(", ")}.`;
  return (
    <figure className="chart">
      <div className="chartwrap">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
          {[0, 50, 100].map((v) => (
            <g key={v}>
              <line
                x1={L}
                x2={W - R}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--line)"
                strokeWidth="1"
                strokeDasharray={v === 50 ? "4 4" : undefined}
              />
              <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="12" fill="var(--muted)">
                {v}%
              </text>
            </g>
          ))}
          <polyline
            points={xy.map((p) => p.join(",")).join(" ")}
            fill="none"
            stroke="var(--sec)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {xy.map((p, i) => (
            <g key={i}>
              <circle cx={p[0]} cy={p[1]} r="5" fill="var(--pri)" />
              {/* put the number below the point when it would run out of the top */}
              <text
                x={p[0]}
                y={data[i].rate > 88 ? p[1] + 22 : p[1] - 12}
                textAnchor="middle"
                fontSize="13"
                fontWeight="600"
                fill="var(--ink)"
              >
                {data[i].rate}%
              </text>
              {i % every === 0 && (
                <text x={p[0]} y={H - 16} textAnchor="middle" fontSize="12" fill="var(--muted)">
                  {data[i].label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
      <figcaption className="hint">
        Share of assigned tasks that were completed. This is a task count, not a full
        measure of performance.
      </figcaption>
      <details className="chartdata">
        <summary>View these values as a table</summary>
        <table>
          <caption className="sr">{caption}</caption>
          <thead>
            <tr>
              <th scope="col">Week of</th>
              <th scope="col" className="num">
                Task completion rate
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i}>
                <th scope="row">{d.label}</th>
                <td className="num">{d.rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
