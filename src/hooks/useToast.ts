import { useState, useCallback, useEffect } from "react";

export interface Toast {
  id: number;
  message: string;
  type: "info" | "success" | "error";
}

let nextId = 0;

// Module-level state so toasts survive component unmounts
const listeners = new Set<(toasts: Toast[]) => void>();
let toasts: Toast[] = [];

function notify() {
  for (const fn of listeners) fn([...toasts]);
}

function addToast(message: string, type: Toast["type"]) {
  const id = nextId++;
  toasts = [...toasts, { id, message, type }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, 4000);
}

export function useToast() {
  const [items, setItems] = useState<Toast[]>(toasts);

  useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  const toast = useCallback((message: string, type: Toast["type"] = "info") => {
    addToast(message, type);
  }, []);

  const success = useCallback((msg: string) => toast(msg, "success"), [toast]);
  const error = useCallback((msg: string) => toast(msg, "error"), [toast]);
  const info = useCallback((msg: string) => toast(msg, "info"), [toast]);

  return { toasts: items, toast, success, error, info };
}
