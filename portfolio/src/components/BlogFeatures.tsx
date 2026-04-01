import { Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function BlogFeatures() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [pathLength, setPathLength] = useState(0);
  const rectRef = useRef<SVGRectElement>(null);

  useEffect(() => {
    const words = document.body.innerText.split(/\s+/).length;
    const totalReadingTime = Math.ceil(words / 200); // 200 WPM

    if (rectRef.current) {
      setPathLength(rectRef.current.getTotalLength());
    }

    const handleResize = () => {
      if (rectRef.current) {
        setPathLength(rectRef.current.getTotalLength());
      }
    };

    window.addEventListener("resize", handleResize);

    const updateScroll = () => {
      const currentScroll = window.scrollY;
      const scrollHeight =
        document.documentElement.scrollHeight - window.innerHeight;

      if (scrollHeight > 0) {
        const progress = (currentScroll / scrollHeight) * 100;
        setScrollProgress(progress);
        setIsReading(progress > 2 && progress < 99);

        const timeRemaining = Math.max(
          1,
          Math.ceil(totalReadingTime * (1 - progress / 100)),
        );
        setRemainingTime(timeRemaining);
      }
    };

    window.addEventListener("scroll", updateScroll);
    updateScroll();

    return () => {
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none z-[9998]"
        preserveAspectRatio="none"
      >
        <rect
          ref={rectRef}
          x="2"
          y="2"
          width="calc(100% - 4px)"
          height="calc(100% - 4px)"
          rx="12"
          ry="12"
          fill="none"
          stroke="var(--color-tertiary)"
          strokeWidth="4"
          strokeDasharray={pathLength}
          strokeDashoffset={pathLength - (scrollProgress / 100) * pathLength}
          strokeLinecap="round"
          className="transition-all duration-75 ease-out opacity-80"
        />
      </svg>

      <div
        className={`fixed bottom-6 right-6 md:bottom-8 md:right-8 z-[9999] bg-tertiary backdrop-blur-md shadow-lg rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 transition-all duration-500 transform ${
          isReading
            ? "translate-y-0 opacity-100"
            : "translate-y-10 opacity-0 pointer-events-none"
        }`}
      >
        <Clock className="w-3.5 h-3.5 text-tertiary-foreground" />
        <span className="text-[11px] font-mono font-semibold tracking-tight text-tertiary-foreground mt-px">
          {remainingTime} min left
        </span>
      </div>
    </>
  );
}
