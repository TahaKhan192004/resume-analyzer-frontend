import * as React from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-line bg-white/92 p-4 shadow-[0_14px_38px_rgba(21,36,38,0.07)] backdrop-blur", className)} {...props} />;
}
