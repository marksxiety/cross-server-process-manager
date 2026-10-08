import { cn } from "@/lib/utils";
import { getStatusVisual } from "@/lib/status-styles";
import type { EffectiveStatusInput } from "@/lib/process-status";

export function StatusDot({
    process,
    className,
}: {
    process?: EffectiveStatusInput | null;
    className?: string;
}) {
    const visual = getStatusVisual(process);

    return (
        <span
            className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                visual.dot,
                visual.pulse && "animate-pulse",
                className,
            )}
        />
    );
}
