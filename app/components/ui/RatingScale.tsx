"use client";

interface RatingScaleProps {
  values: number[];
  getColor: (value: number) => string;
  onSelect: (value: number) => void;
}

// The 0-10 / 1-10 tappable number grid used for RPE and pain scores.
// Reused as-is across the pre-workout pain scale, the post-workout RPE
// screen, and the post-workout pain scale — only the value range, color
// function (getRPEColor / getPainColor) and onSelect callback differ.
export default function RatingScale({ values, getColor, onSelect }: RatingScaleProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3 max-w-2xl mb-12">
      {values.map((num) => (
        <button
          key={num}
          onClick={() => onSelect(num)}
          className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl text-xl font-black text-white transition-all transform hover:scale-110 shadow-lg ${getColor(num)}`}
        >
          {num}
        </button>
      ))}
    </div>
  );
}
