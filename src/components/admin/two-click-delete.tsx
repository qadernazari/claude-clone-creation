import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

/**
 * Two-click delete pattern. First click "arms" the button (red, "Click again to delete").
 * Auto-resets after `timeout` ms. Second click confirms.
 * Avoids window.confirm() which fails silently in iframes.
 */
export function TwoClickDelete({
  onConfirm,
  label = "Delete",
  armedLabel = "Click again to delete",
  className = "",
  timeout = 3500,
  iconOnly = false,
}: {
  onConfirm: () => void;
  label?: string;
  armedLabel?: string;
  className?: string;
  timeout?: number;
  iconOnly?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (tRef.current) clearTimeout(tRef.current); }, []);

  function click() {
    if (!armed) {
      setArmed(true);
      tRef.current = setTimeout(() => setArmed(false), timeout);
      return;
    }
    if (tRef.current) clearTimeout(tRef.current);
    setArmed(false);
    onConfirm();
  }

  const base = "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors";
  const cls = armed
    ? `${base} bg-destructive text-destructive-foreground`
    : `${base} text-muted-foreground hover:text-destructive hover:bg-destructive/10`;

  return (
    <button type="button" onClick={click} className={`${cls} ${className}`}>
      <Trash2 className="h-3.5 w-3.5" />
      {!iconOnly && <span>{armed ? armedLabel : label}</span>}
    </button>
  );
}
