
import { useEffect } from "react";

export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    const { overflow } = document.body.style;
    if (locked) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = overflow || "";
    }
    return () => {
      document.body.style.overflow = overflow || "";
    };
  }, [locked]);
}
