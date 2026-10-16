import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface NativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const NativeModal: React.FC<NativeModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onClose();
    };

    dialog.addEventListener('close', handleClose);

    // Mandatory fallback for browsers without native closedby support
    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;

      if (isDialogContent) return;
      dialog.close();
    };

    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('click', handleBackdropClick);
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby={titleId}
      className="w-[94vw] max-w-lg max-h-[88dvh] rounded-[26px] bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] m3-dialog-shadow p-0 overflow-hidden m-auto"
    >
      <div className="flex flex-col max-h-[88dvh]">
        <div className="flex items-center justify-between px-5 pt-4 pb-3.5 border-b border-[var(--border)] bg-surface-container-low/80 shrink-0">
          <div className="min-w-0 pr-3">
            <h2
              id={titleId}
              className="font-display text-base font-bold tracking-[-0.015em] text-on-surface truncate"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-on-surface-variant truncate mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="關閉視窗"
            className="w-10 h-10 rounded-xl bg-surface-container-high/80 hover:bg-surface-container-highest text-on-surface-variant flex items-center justify-center active:scale-95 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
        <div className="px-5 pt-4 pb-5 overflow-y-auto custom-scroll flex-1 bg-[var(--card)]">
          {children}
        </div>
      </div>
    </dialog>
  );
};
