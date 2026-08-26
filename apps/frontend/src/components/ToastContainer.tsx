import { useEffect, useState } from "react";
import { subscribeToasts, type ToastItem } from "@/lib/toast";

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  return (
    <div className="toast-container" id="toast-container">
      {items.map((item) => (
        <div key={item.id} className={`toast ${item.type}`}>
          {item.message}
        </div>
      ))}
    </div>
  );
}