// Simple line chart: data = [{ label, rate }]
export default function Trend({ data }) {
  if (!data.length)
    return (
      <p className="muted">The chart appears once there are sent reports.</p>
    );
  const lo = Math.min(...data.map((d) => d.rate), 50),
    W = data.length > 1 ? 480 / (data.length - 1) : 0;
  const xy = data.map((d, i) => [40 + i * W, 112 - (d.rate - lo) * 1.5]);
  return (
    <svg
      viewBox="0 0 560 150"
      width="100%"
      role="img"
      aria-label="Tasks completed by week"
    >
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
          <text
            x={p[0]}
            y={p[1] - 12}
            textAnchor="middle"
            fontSize="13"
            fill="var(--ink)"
          >
            {data[i].rate}%
          </text>
          <text
            x={p[0]}
            y="144"
            textAnchor="middle"
            fontSize="12"
            fill="var(--muted)"
          >
            {data[i].label}
          </text>
        </g>
      ))}
    </svg>
  );
}
