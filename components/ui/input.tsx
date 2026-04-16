import * as React from "react";

import { cn } from "@/lib/utils";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "focus-ring min-h-9 w-full rounded-md border border-line bg-white/95 px-3 py-1.5 text-sm text-ink shadow-[0_1px_0_rgba(255,255,255,0.8)] transition placeholder:text-[#7a8a86] hover:border-[#b4c9c4]",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn("focus-ring w-full rounded-md border border-line bg-white/95 px-3 py-2 text-sm text-ink shadow-[0_1px_0_rgba(255,255,255,0.8)] transition placeholder:text-[#7a8a86] hover:border-[#b4c9c4]", props.className)}
    />
  );
}
