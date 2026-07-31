import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";
import { useEffect, useMemo, useRef, useState } from "react";

interface PretextTextProps {
  text: string;
  font?: string;
  lineHeightPx?: number;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "div";
}

export default function PretextText({
  text,
  font = "16px Inter",
  lineHeightPx = 24,
  className = "",
  as = "div",
}: PretextTextProps) {
  const containerRef = useRef<HTMLElement>(null);
  const [containerWidth, setContainerWidth] = useState(() => {
    if (typeof window !== "undefined" && (window as any).__PRETEXT_WIDTH_CACHE) {
      return (window as any).__PRETEXT_WIDTH_CACHE;
    }
    return 0;
  });

  useEffect(() => {
    if (containerRef.current) {
      const w = containerRef.current.clientWidth;
      setContainerWidth(w);
      (window as any).__PRETEXT_WIDTH_CACHE = w;
    }

    const ob = new ResizeObserver((entries) => {
      if (entries[0] && entries[0].contentRect.width > 0) {
        const w = entries[0].contentRect.width;
        setContainerWidth(w);
        (window as any).__PRETEXT_WIDTH_CACHE = w;
      }
    });

    if (containerRef.current) {
      ob.observe(containerRef.current);
    }

    return () => ob.disconnect();
  }, []);

  // Pretext calculations
  const result = useMemo(() => {
    if (!text || containerWidth === 0) return null;
    try {
      const prepared = prepareWithSegments(text, font);
      return layoutWithLines(prepared, containerWidth, lineHeightPx);
    } catch (e) {
      console.error("Pretext error:", e);
      return null;
    }
  }, [text, font, containerWidth, lineHeightPx]);

  const Tag = as as any;

  if (!result) {
    return (
      <Tag
        ref={containerRef}
        className={`w-full ${className} leading-[${lineHeightPx}px] text-balance text-pretty`}
      >
        {text}
      </Tag>
    );
  }

  return (
    <Tag
      ref={containerRef}
      className={`relative block w-full ${className}`}
      style={{ height: result.height }}
    >
      {result.lines.map((line, i) => (
        <span
          key={i}
          className="absolute left-0"
          style={{
            top: i * lineHeightPx,
            height: lineHeightPx,
            lineHeight: `${lineHeightPx}px`,
            whiteSpace: "pre",
          }}
        >
          {line.text}
        </span>
      ))}
    </Tag>
  );
}
