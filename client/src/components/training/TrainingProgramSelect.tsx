import { TRAINING_PROGRAMS } from "../../lib/trainingPrograms";
import { Select } from "@base-ui/react/select";

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
    <Select.Root
      id={id}
      value={value}
      onValueChange={(next) => {
        if (next != null) onChange(Number(next));
      }}
    >
      <Select.Trigger
        className={`flex min-w-48 items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-200 ${className}`}
      >
        <Select.Value />
        <Select.Icon className="ml-3 text-slate-500">⌄</Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className="z-50" sideOffset={6}>
          <Select.Popup className="min-w-[var(--anchor-width)] rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
            <Select.List>
              {TRAINING_PROGRAMS.map((p) => (
                <Select.Item
                  key={p.id}
                  value={p.id}
                  className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-slate-700 outline-none data-[highlighted]:bg-indigo-50 data-[selected]:font-semibold data-[selected]:text-indigo-700"
                >
                  <Select.ItemText>{p.label}</Select.ItemText>
                  <Select.ItemIndicator>✓</Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
