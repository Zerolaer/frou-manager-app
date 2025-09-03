import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export const Portal: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const ref = useRef<Element | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = document.getElementById("portal-root");
    if (!el) {
      const div = document.createElement("div");
      div.id = "portal-root";
      document.body.appendChild(div);
      ref.current = div;
    } else {
      ref.current = el;
    }
    setMounted(true);
    return () => {};
  }, []);

  return mounted && ref.current ? createPortal(children, ref.current) : null;
};