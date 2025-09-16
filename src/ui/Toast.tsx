import React, { createContext, useContext, useMemo, useState } from "react";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; type: ToastType; message: string };

type ToastApi = {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
};

const ToastCtx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function push(type: ToastType, message: string) {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    []
  );

  return (
    <ToastCtx.Provider value={api}>
      <div style={containerStyle}>
        {toasts.map((t) => (
          <div key={t.id} style={{ ...toastStyle, ...byTypeStyle[t.type] }}>
            {t.message}
          </div>
        ))}
      </div>
      {children}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}

const containerStyle: React.CSSProperties = {
  position: "fixed",
  top: 16,
  right: 16,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  zIndex: 9999,
  pointerEvents: "none",
};
const toastStyle: React.CSSProperties = {
  pointerEvents: "auto",
  padding: "10px 12px",
  borderRadius: 12,
  boxShadow: "0 10px 25px rgba(0,0,0,.15)",
  color: "#0b1020",
  fontSize: 14,
  border: "1px solid transparent",
  background: "white",
};
const byTypeStyle: Record<ToastType, React.CSSProperties> = {
  success: { background: "#e9fce9", borderColor: "#b9e6b9", color: "#146c2e" },
  error:   { background: "#fde8e8", borderColor: "#f8b4b4", color: "#9b1c1c" },
  info:    { background: "#eef2ff", borderColor: "#c7d2fe", color: "#1e3a8a" },
};
