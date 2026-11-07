import type { ClaimStatus } from "@/domain/types";

const LABEL: Record<ClaimStatus, string> = {
  documented: "Documented",
  disputed: "Disputed",
  approximate: "Approximate",
  traditional: "Tradition",
};

export function ClaimTag({ tag, className = "" }: { tag: ClaimStatus | null; className?: string }) {
  if (!tag) return null;
  return (
    <span className={`claim-tag ${className}`} data-tag={tag}>
      {LABEL[tag]}
    </span>
  );
}
