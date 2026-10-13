import { Dumbbell } from "lucide-react";

interface IconProps {
  size?: number;
  className?: string;
}

// Lucide has no kettlebell (and Unicode has no kettlebell emoji), so this is
// drawn to match lucide's grid: 24×24 viewBox, 2px round stroke, currentColor.
export function KettlebellIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* handle */}
      <path d="M8.5 9.5 7.6 6.2A2.5 2.5 0 0 1 10 3h4a2.5 2.5 0 0 1 2.4 3.2l-.9 3.3" />
      {/* bell */}
      <path d="M6.6 20.5a7 7 0 1 1 10.8 0Z" />
    </svg>
  );
}

// The icon for an EQUIPMENT_LIST id — a kettlebell for "kettlebell", the
// generic dumbbell for everything else (as before).
export function EquipmentIcon({ id, size = 24, className }: IconProps & { id: string }) {
  return id === "kettlebell" ? <KettlebellIcon size={size} className={className} /> : <Dumbbell size={size} className={className} />;
}
