"use client";

// Classic r/place 16-color palette
export const COLORS = [
  "#FFFFFF", // white
  "#E4E4E4", // light gray
  "#888888", // gray
  "#222222", // black
  "#FFA7D1", // pink
  "#E50000", // red
  "#E59500", // orange
  "#A06A42", // brown
  "#E5D900", // yellow
  "#94E044", // lime
  "#02BE01", // green
  "#00D3DD", // cyan
  "#0083C7", // blue
  "#0000EA", // dark blue
  "#CF6EE4", // purple
  "#820080", // magenta
];

interface ColorPaletteProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  disabled?: boolean;
}

export default function ColorPalette({
  selectedColor,
  onColorSelect,
  disabled = false,
}: ColorPaletteProps) {
  return (
    <div className="flex flex-wrap gap-1 p-2 bg-gray-900 rounded-lg max-w-[280px]">
      {COLORS.map((color) => (
        <button
          key={color}
          onClick={() => onColorSelect(color)}
          disabled={disabled}
          className={`w-8 h-8 rounded transition-transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
            selectedColor === color
              ? "ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110"
              : ""
          }`}
          style={{ backgroundColor: color }}
          title={color}
        />
      ))}
    </div>
  );
}
