"use client";

interface RatingSliderProps {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function RatingSlider({
  label,
  description,
  value,
  onChange,
  min = 0,
  max = 100,
}: RatingSliderProps) {
  const getColor = (val: number) => {
    if (val < 33) return "bg-red-500";
    if (val < 67) return "bg-amber-500";
    return "bg-green-500";
  };

  const getLabel = (val: number) => {
    if (val === 0) return "Not Rated";
    if (val < 33) return "Needs Improvement";
    if (val < 67) return "Good";
    return "Excellent";
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <label className="block text-sm font-medium text-gray-900">{label}</label>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary-600">{value}</div>
          <div className="text-xs text-gray-500">{getLabel(value)}</div>
        </div>
      </div>

      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, ${
              value < 33 ? "#ef4444" : value < 67 ? "#f59e0b" : "#10b981"
            } 0%, ${
              value < 33 ? "#ef4444" : value < 67 ? "#f59e0b" : "#10b981"
            } ${value}%, #e5e7eb ${value}%, #e5e7eb 100%)`,
          }}
        />
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #9333ea;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #9333ea;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}

