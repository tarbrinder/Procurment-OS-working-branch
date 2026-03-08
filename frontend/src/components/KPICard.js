export const KPICard = ({ icon: Icon, label, value, accent }) => {
  const accentClass =
    { blue: "kpi-accent-blue", green: "kpi-accent-green", amber: "kpi-accent-amber", red: "kpi-accent-red" }[accent] || "";

  return (
    <div
      className={`kpi-card ${accentClass}`}
      data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="kpi-icon">
        <Icon size={20} />
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
};
