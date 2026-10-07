import { Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function BlogFeatures() {
	const viewportRef = useRef<HTMLDivElement>(null);
	const [scrollProgress, setScrollProgress] = useState(0);
	const [isReading, setIsReading] = useState(false);
	const [remainingTime, setRemainingTime] = useState(0);

	useEffect(() => {
		const words = document.body.innerText.split(/\s+/).length;
		const totalReadingTime = Math.ceil(words / 200); // 200 WPM
		const viewport = window.visualViewport;
		let animationFrame: number | null = null;

		const updateScroll = () => {
			animationFrame = null;
			// Safari's toolbars change the visible viewport's size and offset.
			// Keep the frame on that viewport, including during zoom/panning.
			if (viewport && viewportRef.current) {
				const style = viewportRef.current.style;
				style.width = `${viewport.width}px`;
				style.height = `${viewport.height}px`;
				style.transform = `translate(${viewport.offsetLeft}px, ${viewport.offsetTop}px)`;
			}
			// Use documentElement.clientHeight which is more stable than window.innerHeight on iOS Safari
			const currentScroll =
				window.scrollY || document.documentElement.scrollTop;
			const scrollHeight = Math.max(
				0,
				document.documentElement.scrollHeight -
					document.documentElement.clientHeight,
			);

			// Clamp between 0 and 100 to handle iOS Safari rubber-band overscrolling
			const rawProgress =
				scrollHeight > 0 ? (currentScroll / scrollHeight) * 100 : 0;
			const progress = Math.min(100, Math.max(0, rawProgress));

			setScrollProgress(progress);
			setIsReading(progress > 2 && progress < 99);

			const timeRemaining = Math.max(
				1,
				Math.ceil(totalReadingTime * (1 - progress / 100)),
			);
			setRemainingTime(timeRemaining);
		};

		const scheduleUpdate = () => {
			if (animationFrame === null)
				animationFrame = requestAnimationFrame(updateScroll);
		};
		window.addEventListener("scroll", scheduleUpdate, { passive: true });
		window.addEventListener("resize", scheduleUpdate);
		viewport?.addEventListener("resize", scheduleUpdate);
		viewport?.addEventListener("scroll", scheduleUpdate);
		updateScroll();

		return () => {
			window.removeEventListener("scroll", scheduleUpdate);
			window.removeEventListener("resize", scheduleUpdate);
			viewport?.removeEventListener("resize", scheduleUpdate);
			viewport?.removeEventListener("scroll", scheduleUpdate);
			if (animationFrame !== null) cancelAnimationFrame(animationFrame);
		};
	}, []);

	return (
		<div
			ref={viewportRef}
			className="fixed top-0 left-0 w-full h-[100dvh] pointer-events-none z-[9998]"
		>
			<svg
				aria-hidden="true"
				className="reading-perimeter absolute inset-0 h-full w-full"
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
				aria-hidden="true"
				className="reading-line absolute inset-y-0 right-0 w-[3px]"
			>
				<div
					className="h-full w-full origin-top rounded-full bg-tertiary opacity-80 transition-transform duration-75 ease-out motion-reduce:transition-none"
					style={{ transform: `scaleY(${scrollProgress / 100})` }}
				/>
			</div>

			<div
				className={`absolute bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] right-[max(1.5rem,env(safe-area-inset-right,0px))] md:bottom-[max(2rem,env(safe-area-inset-bottom,0px))] md:right-[max(2rem,env(safe-area-inset-right,0px))] bg-tertiary backdrop-blur-md shadow-lg rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 transition-all duration-500 transform ${
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
		</div>
	);
}
