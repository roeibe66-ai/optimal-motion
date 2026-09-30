"use client";

import dynamic from "next/dynamic";

const BodyModel = dynamic(() => import("react-body-highlighter"), { ssr: false });

interface BodyDiagramProps {
  highlightedMuscles: string[];
  onMuscleClick: (muscle: string) => void;
}

// Thin wrapper around react-body-highlighter's client-only body model,
// used for the pain-area check-in on the pre-workout screen. The library
// applies these via inline `style.fill`, so CSS variables work. Selected
// pain areas use --warning (not --danger, which is reserved for errors,
// and not the teal muscle-primary, which means "muscles this exercise works").
export default function BodyDiagram({ highlightedMuscles, onMuscleClick }: BodyDiagramProps) {
  return (
    <BodyModel
      data={[{ name: "Pain Areas", muscles: highlightedMuscles as never }]}
      onClick={({ muscle }: { muscle: string }) => onMuscleClick(muscle)}
      bodyColor="var(--muscle-inactive-dark)"
      highlightedColors={["var(--warning)"]}
    />
  );
}
