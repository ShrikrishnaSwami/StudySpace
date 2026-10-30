"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Render dialogs at document.body so fixed positioning always uses the
 * browser viewport, independent of long pages and transformed app shells.
 */
export default function ViewportPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? createPortal(<div data-viewport-portal="" className="contents">{children}</div>, document.body) : null;
}
