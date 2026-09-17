import { cn } from "@/lib/utils";
import { toneDotClasses } from "@/lib/status-tone";
import type { Tone } from "@/types/tone";

export function StatusDot({ tone, className }: { tone: Tone; className?: string }) {
    return <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", toneDotClasses[tone], className)} />;
}
