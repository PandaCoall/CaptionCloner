"use client";

type Props = {
  message: string;
  details?: string[];
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorBanner({ message, details, onRetry, retryLabel = "Retry" }: Props) {
  return (
    <div className="rounded-xl border border-red-900/70 bg-red-950/40 p-4 text-sm text-red-100">
      <p className="font-medium">{message}</p>
      {details && details.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 font-mono text-xs text-red-200/90">
          {details.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md border border-red-700 px-3 py-1.5 text-xs font-medium text-red-100 hover:bg-red-900/50"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
