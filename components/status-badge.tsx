import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  completed: "border-[#9bd8c4] bg-[#e8f8f2] text-[#145742]",
  shortlist: "border-[#9bd8c4] bg-[#e8f8f2] text-[#145742]",
  review: "border-[#f0d892] bg-[#fff7dd] text-[#765a11]",
  draft: "border-[#f0d892] bg-[#fff7dd] text-[#765a11]",
  sent: "border-[#9bd8c4] bg-[#e8f8f2] text-[#145742]",
  reject: "border-[#f1b2a4] bg-[#fff0ed] text-[#9c3726]",
  failed: "border-[#f1b2a4] bg-[#fff0ed] text-[#9c3726]",
  running: "border-[#a8dbe8] bg-[#edfafe] text-[#215e6c]",
  queued: "border-[#c7d99a] bg-[#f4f8df] text-[#59681f]",
  pending: "border-[#d1dbd8] bg-[#f4f7f6] text-[#56635f]"
};

export function StatusBadge({ value }: { value?: string }) {
  const label = value || "unknown";
  return <span className={cn("inline-flex rounded-md border px-2 py-1 text-xs font-bold", styles[label] ?? styles.pending)}>{label}</span>;
}
