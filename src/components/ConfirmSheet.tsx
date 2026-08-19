import type { ReactNode } from "react";
import "./ConfirmSheet.css";

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirming?: boolean;
  tone?: "positive" | "negative";
  children?: ReactNode;
}

export default function ConfirmSheet({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  confirming,
  tone = "positive",
  children
}: ConfirmSheetProps) {
  if (!open) return null;

  return (
    <div className="sheet-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />
        <h3 className="sheet-title">{title}</h3>
        {description && <p className="sheet-description">{description}</p>}
        {children}
        <div className="sheet-actions">
          <button
            type="button"
            className="sheet-btn sheet-btn-cancel"
            onClick={onCancel}
            disabled={confirming}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`sheet-btn sheet-btn-confirm tone-${tone}`}
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? "Salvando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
