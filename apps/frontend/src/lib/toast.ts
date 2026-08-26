export type ToastType = "success" | "error" | "warning" | "info";

export type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

type Listener = (items: ToastItem[]) => void;

let seq = 0;
let items: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener(items));
}

function push(message: string, type: ToastType) {
  const id = ++seq;
  items = [...items, { id, message, type }];
  emit();
  window.setTimeout(() => {
    items = items.filter((item) => item.id !== id);
    emit();
  }, 2800);
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener);
  listener(items);
  return () => {
    listeners.delete(listener);
  };
}

export const toast = {
  success(message: string) {
    push(message, "success");
  },
  error(message: string) {
    push(message, "error");
  },
  warning(message: string) {
    push(message, "warning");
  },
  info(message: string) {
    push(message, "info");
  },
};