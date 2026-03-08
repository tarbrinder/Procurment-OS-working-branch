export const ProbabilityIndicator = ({ value }) => {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  const color =
    value >= 85 ? "#047857" : value >= 60 ? "#1d4ed8" : value >= 40 ? "#b45309" : "#b91c1c";

  return (
    <div className="inline-flex items-center gap-1.5" data-testid="probability-indicator">
      <svg width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 18 18)"
          style={{ transition: "stroke-dashoffset 0.3s ease" }}
        />
        <text
          x="18"
          y="18"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="9"
          fontWeight="700"
          fill={color}
        >
          {value}%
        </text>
      </svg>
    </div>
  );
};
