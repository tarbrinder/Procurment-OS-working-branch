import { STAGE_LABELS, STAGE_COLORS } from "@/lib/constants";

export const StageBadge = ({ stage }) => {
  const colors = STAGE_COLORS[stage] || { bg: "#f3f4f6", text: "#4b5563", border: "#e5e7eb" };

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
      style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}
      data-testid={`stage-badge-${stage}`}
    >
      {STAGE_LABELS[stage] || stage}
    </span>
  );
};
