import { useToast } from "../hooks/useToast";

export function ToastHost() {
  const { toasts } = useToast();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-all animate-in ${
            t.type === "error"
              ? "bg-red-500 text-white"
              : t.type === "success"
                ? "bg-green-500 text-white"
                : "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
