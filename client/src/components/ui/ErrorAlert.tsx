interface ErrorAlertProps {
  message: string;
  title?: string;
}

export function ErrorAlert({ message, title }: ErrorAlertProps) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
      {title && <p className="font-medium">{title}</p>}
      <p className={title ? "text-sm mt-1" : ""}>{message}</p>
    </div>
  );
}
