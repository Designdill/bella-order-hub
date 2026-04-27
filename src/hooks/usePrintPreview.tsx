import { useState, useCallback } from "react";
import type { PreviewPayload } from "@/components/PrintPreviewDialog";

export function usePrintPreview() {
  const [payload, setPayload] = useState<PreviewPayload | null>(null);
  const open = useCallback((p: PreviewPayload) => setPayload(p), []);
  const close = useCallback(() => setPayload(null), []);
  return { payload, isOpen: !!payload, open, close };
}