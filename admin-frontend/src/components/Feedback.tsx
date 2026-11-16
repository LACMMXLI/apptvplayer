import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Icon from './Icon';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  /** Styles the confirm button as destructive (default true — confirms are used for deletes). */
  danger?: boolean;
}

type ToastKind = 'success' | 'error';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface FeedbackValue {
  /** In-app replacement for window.confirm(). Resolves true if the user confirms. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  toast: (message: string, kind?: ToastKind) => void;
  /**
   * Runs an API action and reports a failure as an error toast instead of an
   * unhandled rejection. Resolves true on success.
   */
  attempt: (action: () => Promise<unknown>, successMessage?: string) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackValue | undefined>(undefined);

const TOAST_DURATION_MS = 4500;

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nextId = useRef(0);

  const toast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = ++nextId.current;
    setToasts((prev) => [...prev.slice(-3), { id, kind, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), TOAST_DURATION_MS);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    // Only one dialog at a time: a pending one is answered "no".
    resolver.current?.(false);
    setDialog(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const attempt = useCallback(
    async (action: () => Promise<unknown>, successMessage?: string) => {
      try {
        await action();
        if (successMessage) toast(successMessage);
        return true;
      } catch (err) {
        toast(err instanceof Error && err.message ? err.message : 'Algo salió mal. Inténtalo de nuevo.', 'error');
        return false;
      }
    },
    [toast],
  );

  // Native <dialog>: showModal() gives focus trapping, Esc to close and an
  // inert background for free.
  useEffect(() => {
    const el = dialogRef.current;
    if (dialog && el && !el.open) el.showModal();
  }, [dialog]);

  function settle(result: boolean) {
    resolver.current?.(result);
    resolver.current = null;
    dialogRef.current?.close();
    setDialog(null);
  }

  const value = useMemo(() => ({ confirm, toast, attempt }), [confirm, toast, attempt]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      {dialog && (
        <dialog
          ref={dialogRef}
          className="confirm-dialog"
          aria-labelledby="confirm-dialog-title"
          onCancel={(e) => {
            e.preventDefault();
            settle(false);
          }}
          onClick={(e) => {
            // A click on the backdrop lands on the <dialog> element itself.
            if (e.target === e.currentTarget) settle(false);
          }}
        >
          <div className="confirm-dialog-body">
            <h2 id="confirm-dialog-title">{dialog.title}</h2>
            {dialog.message && <p>{dialog.message}</p>}
            <div className="confirm-dialog-actions">
              <button type="button" className="btn-secondary" onClick={() => settle(false)} autoFocus>
                Cancelar
              </button>
              <button
                type="button"
                className={dialog.danger === false ? 'btn-primary' : 'btn-danger'}
                onClick={() => settle(true)}
              >
                {dialog.confirmLabel ?? 'Eliminar'}
              </button>
            </div>
          </div>
        </dialog>
      )}

      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            <Icon name={t.kind === 'error' ? 'alert' : 'check'} size={16} />
            <span>{t.message}</span>
            <button
              type="button"
              className="toast-close"
              aria-label="Cerrar aviso"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used within FeedbackProvider');
  return ctx;
}
