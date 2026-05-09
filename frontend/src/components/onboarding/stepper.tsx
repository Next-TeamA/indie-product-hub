"use client";

import { cn } from "@/lib/utils";

interface StepperProps {
  steps: string[];
  currentIndex: number;
}

export function Stepper({ steps, currentIndex }: StepperProps) {
  return (
    <div className="fixed top-7 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2">
      {steps.map((_, i) => (
        <div
          key={i}
          className={cn(
            "stepper-dot",
            i === currentIndex ? "stepper-dot--active" : "stepper-dot--inactive"
          )}
        />
      ))}
    </div>
  );
}
