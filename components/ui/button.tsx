import * as React from "react";

import { cn } from "@/lib/utils";

export function Button({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-moss px-3 py-1.5 text-xs font-bold leading-none text-white transition disabled:cursor-not-allowed disabled:opacity-60",
        "shadow-[0_8px_18px_rgba(20,122,108,0.18)] hover:bg-[#10685d] active:translate-y-px",
        className
      )}
      {...props}
    />
  );
}
