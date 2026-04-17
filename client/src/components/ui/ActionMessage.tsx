interface ActionMessageProps {
  message: string;
  variant?: "info" | "error";
}

export function ActionMessage({ message, variant = "info" }: ActionMessageProps) {
  const styles =
    variant === "error"
      ? "bg-red-50 border-red-200 text-red-700"
      : "bg-blue-50 border-blue-200 text-blue-700";

  return (
    <div className={`border rounded-lg px-4 py-2 text-sm ${styles}`}>
      {message}
    </div>
  );
}
