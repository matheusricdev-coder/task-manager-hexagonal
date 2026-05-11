import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ToastItem {
  id: number;
  message: string;
  variant: "success" | "error" | "info";
}

interface UIContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
  };
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

const TOAST_TIMEOUT = 3800;

export const UIProvider = ({ children }: { children: ReactNode }) => {
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastSeq = useRef(0);

  const confirm = useCallback(
    (opts: ConfirmOptions): Promise<boolean> =>
      new Promise((resolve) => {
        setConfirmState({ options: opts, resolve });
      }),
    []
  );

  const closeConfirm = (result: boolean): void => {
    setConfirmState((prev) => {
      if (prev) prev.resolve(result);
      return null;
    });
  };

  const pushToast = (message: string, variant: ToastItem["variant"]): void => {
    const id = ++toastSeq.current;
    setToasts((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_TIMEOUT);
  };

  const toast = {
    success: (msg: string) => pushToast(msg, "success"),
    error: (msg: string) => pushToast(msg, "error"),
    info: (msg: string) => pushToast(msg, "info"),
  };

  useEffect(() => {
    if (!confirmState) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") closeConfirm(false);
      if (e.key === "Enter") closeConfirm(true);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [confirmState]);

  return (
    <UIContext.Provider value={{ confirm, toast }}>
      {children}
      {confirmState &&
        createPortal(
          <div
            className="modal-backdrop"
            onMouseDown={() => closeConfirm(false)}
          >
            <div
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <h2 id="modal-title" className="modal-title">
                {confirmState.options.title}
              </h2>
              {confirmState.options.message && (
                <div className="modal-body">{confirmState.options.message}</div>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => closeConfirm(false)}
                >
                  {confirmState.options.cancelLabel ?? "Cancelar"}
                </button>
                <button
                  type="button"
                  className={`btn ${
                    confirmState.options.danger ? "btn--danger" : ""
                  }`}
                  onClick={() => closeConfirm(true)}
                  autoFocus
                >
                  {confirmState.options.confirmLabel ?? "Confirmar"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      {createPortal(
        <div className="toast-stack" aria-live="polite" aria-atomic="true">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast--${t.variant}`}>
              <span className="toast-dot" />
              {t.message}
            </div>
          ))}
        </div>,
        document.body
      )}
    </UIContext.Provider>
  );
};

export const useConfirm = (): UIContextValue["confirm"] => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useConfirm must be used inside UIProvider");
  return ctx.confirm;
};

export const useToast = (): UIContextValue["toast"] => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useToast must be used inside UIProvider");
  return ctx.toast;
};
