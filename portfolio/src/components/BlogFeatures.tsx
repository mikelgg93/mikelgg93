import { Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function BlogFeatures() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  useEffect(() => {
    const words = document.body.innerText.split(/\s+/).length;
    const totalReadingTime = Math.ceil(words / 200); // 200 WPM

    const updateScroll = () => {
      // Use documentElement.clientHeight which is more stable than window.innerHeight on iOS Safari
      const currentScroll = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = Math.max(
        0,
        document.documentElement.scrollHeight - document.documentElement.clientHeight
      );

      if (scrollHeight > 0) {
        // Clamp between 0 and 100 to handle iOS Safari rubber-band overscrolling
        const rawProgress = (currentScroll / scrollHeight) * 100;
        const progress = Math.min(100, Math.max(0, rawProgress));
        
        setScrollProgress(progress);
        setIsReading(progress > 2 && progress < 99);

        const timeRemaining = Math.max(
          1,
          Math.ceil(totalReadingTime * (1 - progress / 100)),
        );
        setRemainingTime(timeRemaining);
      }
    };

    window.addEventListener("scroll", updateScroll, { passive: true });
    updateScroll();

    return () => {
      window.removeEventListener("scroll", updateScroll);
    };
  }, []);

  return (
    <>
      <svg
        className="fixed top-0 left-0 w-full h-[100dvh] pointer-events-none z-[9998]"
        preserveAspectRatio="none"
      >
        <rect
          x="2"
          y="2"
          width="calc(100% - 4px)"
          height="calc(100% - 4px)"
          rx="12"
          ry="12"
          fill="none"
          stroke="var(--color-tertiary)"
          strokeWidth="4"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={100 - scrollProgress}
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
