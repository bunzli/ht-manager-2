interface BackLinkProps {
  onClick: () => void;
  label?: string;
}

export function BackLink({ onClick, label = "Back" }: BackLinkProps) {
  return (
    <button
      onClick={onClick}
      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
    >
      ← {label}
    </button>
  );
}
