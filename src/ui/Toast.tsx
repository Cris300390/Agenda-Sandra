// src/ui/Toast.tsx
import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastType = "success" | "error" | "info" | "warning";

type Toast = {
  id: number;
  type: ToastType;
  title?: string;
  message?: string;
  ttl?: number; // milisegundos
};

/** Opciones para el confirm elegante */
type ConfirmOptions = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "primary" | "danger"; // color del botón confirmar
};

type ToastApi = {
  // API básica (compatible con tu firma anterior)
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;

  // API avanzada: crear un toast manual
  show: (t: Omit<Toast, "id">) => void;

  // Confirm elegante (promesa)
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const ToastCtx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmData, setConfirmData] = useState<
    (ConfirmOptions & { resolve: (ok: boolean) => void }) | null
  >(null);
  const idRef = useRef(1);

  function pushToast(input: Omit<Toast, "id">) {
    const id = idRef.current++;
    const t: Toast = { ttl: 3200, ...input, id };
    setToasts((prev) => [...prev, t]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, t.ttl);
  }

  const api = useMemo<ToastApi>(
    () => ({
      // Compatibles con tu antigua firma (title como texto principal).
      success: (title, message) => pushToast({ type: "success", title, message }),
      error: (title, message) => pushToast({ type: "error", title, message }),
      info: (title, message) => pushToast({ type: "info", title, message }),
      warning: (title, message) => pushToast({ type: "warning", title, message }),

      show: (t) => pushToast(t),

      confirm: (opts) =>
        new Promise<boolean>((resolve) => {
          setConfirmData({ ...opts, resolve });
        }),
    }),
    []
  );

  function closeConfirm(ok: boolean) {
    if (confirmData) {
      confirmData.resolve(ok);
      setConfirmData(null);
    }
  }

  return (
    <ToastCtx.Provider value={api}>
      {/* Contenedor de toasts */}
      <div style={containerStyle} aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} style={{ ...toastStyle, ...byTypeStyle[t.type] }}>
            {t.title && <div style={titleStyle}>{t.title}</div>}
            {t.message && <div style={msgStyle}>{t.message}</div>}
            {!t.title && !t.message && <div style={msgStyle}>Notificación</div>}
          </div>
        ))}
      </div>

      {/* Confirm elegante */}
      {confirmData && (
        <>
          <div
            style={backdropStyle}
            onClick={() => closeConfirm(false)}
            aria-hidden
          />
          <div role="dialog" aria-modal="true" style={confirmCardStyle}>
            <h3 style={confirmTitleStyle}>{confirmData.title}</h3>
            {confirmData.message && (
              <p style={confirmMsgStyle}>{confirmData.message}</p>
            )}
            <div style={confirmActionsStyle}>
              <button style={btnStyle} onClick={() => closeConfirm(false)}>
                {confirmData.cancelText ?? "Cancelar"}
              </button>
              <button
                style={{
                  ...btnStyle,
                  ...(confirmData.tone === "danger"
                    ? btnDangerStyle
                    : btnPrimaryStyle),
                }}
                onClick={() => closeConfirm(true)}
              >
                {confirmData.confirmText ?? "Aceptar"}
              </button>
            </div>
          </div>
        </>
      )}

      {children}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}

/* ===================== estilos inline ===================== */
const containerStyle: React.CSSProperties = {
  position: "fixed",
  top: 16,
  right: 16,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  zIndex: 100000,
  pointerEvents: "none",
  width: "min(360px, 92vw)",
};
const toastStyle: React.CSSProperties = {
  pointerEvents: "auto",
  padding: "10px 12px",
  borderRadius: 14,
  boxShadow: "0 10px 24px rgba(0,0,0,.10)",
  color: "#0b1020",
  fontSize: 14,
  border: "1px solid #eee",
  background: "white",
  display: "grid",
  rowGap: 4,
};
const titleStyle: React.CSSProperties = { fontWeight: 800 };
const msgStyle: React.CSSProperties = { color: "#475569", fontSize: 13 };

const byTypeStyle: Record<ToastType, React.CSSProperties> = {
  success: { borderColor: "#bbf7d0", boxShadow: "0 10px 24px rgba(16,185,129,.18)" },
  error:   { borderColor: "#fecaca", boxShadow: "0 10px 24px rgba(239,68,68,.18)" },
  info:    { borderColor: "#bae6fd", boxShadow: "0 10px 24px rgba(14,165,233,.18)" },
  warning: { borderColor: "#fde68a", boxShadow: "0 10px 24px rgba(245,158,11,.18)" },
};

const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.25)",
  backdropFilter: "blur(2px)",
  WebkitBackdropFilter: "blur(2px)",
  zIndex: 100000,
};

const confirmCardStyle: React.CSSProperties = {
  position: "fixed",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  width: "min(560px, 92vw)",
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 25px 50px rgba(0,0,0,.25)",
  zIndex: 100001,
};
const confirmTitleStyle: React.CSSProperties = { margin: 0, fontWeight: 800 };
const confirmMsgStyle: React.CSSProperties = { margin: "8px 0 16px", color: "#475569" };
const confirmActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  justifyContent: "flex-end",
};
const btnStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  background: "#fff",
  borderRadius: 12,
  padding: "8px 12px",
  cursor: "pointer",
};
const btnPrimaryStyle: React.CSSProperties = {
  background:
    "linear-gradient(135deg, #f472b6 0%, #ec4899 100%)",
  color: "#fff",
  borderColor: "#f59fbc",
  boxShadow: "0 6px 20px rgba(236,72,153,.35)",
};
const btnDangerStyle: React.CSSProperties = {
  background: "#fee2e2",
  color: "#b91c1c",
  borderColor: "#fecaca",
};
