import { ShieldCheck } from "lucide-react";

export const VerificationBadge = ({ verification }) => {
  if (!verification || !verification.verified) return null;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border"
      style={{
        background: "#ecfdf5",
        color: "#047857",
        borderColor: "#a7f3d0",
      }}
      data-testid="verification-badge"
    >
      <ShieldCheck size={12} />
      Verified Seller
    </span>
  );
};
