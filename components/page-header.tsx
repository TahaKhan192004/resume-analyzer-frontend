import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-line bg-white/82 p-4 shadow-[0_10px_26px_rgba(21,36,38,0.06)] backdrop-blur", className)}>
      <div className="absolute inset-y-0 left-0 w-1 bg-moss" />
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-normal text-moss">{eyebrow}</p>
          <h1 className="mt-1.5 text-2xl font-black tracking-normal text-ink">{title}</h1>
          {description && <p className="mt-2 max-w-3xl text-sm leading-5 text-[#5f6f6b]">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
