"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

type Burst = {
  id: number;
  x: number;
  y: number;
  strong: boolean;
};

export function JamClickEffect() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    function splash(event: PointerEvent) {
      if (event.button !== 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const target = event.target instanceof Element ? event.target.closest("button:not(:disabled), nav a, a.rounded-full, a[data-jam-effect]") : null;
      if (!target || !target.closest(".catalog-public")) return;

      const id = nextId.current++;
      const strong = target.getAttribute("data-jam-burst") === "strong";
      setBursts(current => [...current.slice(-7), { id, x: event.clientX, y: event.clientY, strong }]);
      window.setTimeout(() => setBursts(current => current.filter(item => item.id !== id)), 850);
    }

    document.addEventListener("pointerdown", splash, { passive: true });
    return () => document.removeEventListener("pointerdown", splash);
  }, []);

  return <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
    {bursts.map(burst => {
      const amount = burst.strong ? 12 : 6;
      return <span key={burst.id} className={`jam-burst ${burst.strong ? "jam-burst--strong" : ""}`} style={{ left: burst.x, top: burst.y }}>
        <span className="jam-burst__center" />
        {Array.from({ length: amount }, (_, index) => {
          const angle = (360 / amount) * index + (burst.strong ? 7 : 0);
          const distance = (burst.strong ? 42 : 26) + (index % 3) * (burst.strong ? 10 : 6);
          const size = (burst.strong ? 7 : 5) + (index % 4) * 2;
          return <span key={index} className="jam-burst__drop" style={{ "--jam-x": `${Math.cos(angle * Math.PI / 180) * distance}px`, "--jam-y": `${Math.sin(angle * Math.PI / 180) * distance}px`, "--jam-size": `${size}px`, "--jam-delay": `${(index % 3) * 18}ms` } as CSSProperties} />;
        })}
      </span>;
    })}
  </div>;
}
