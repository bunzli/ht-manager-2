import { TRAINING_PROGRAMS } from "../../lib/trainingPrograms";

interface TrainingProgramSelectProps {
  value: number;
  onChange: (trainingTypeId: number) => void;
  id?: string;
  className?: string;
}

export function TrainingProgramSelect({
  value,
  onChange,
  id = "training-program",
  className = "",
}: TrainingProgramSelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`}
    >
      {TRAINING_PROGRAMS.map((p) => (
        <option key={p.id} value={p.id}>
          {p.label}
        </option>
      ))}
    </select>
  );
}
