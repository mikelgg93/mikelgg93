import React, { useEffect, useRef, useState } from "react";
import { createIrisScene, type IrisScene } from "./irisScene";

// The pupillary light reflex, paired with an oscilloscope: the dashed line is
// the target diameter the reflex is chasing, the solid line is where the pupil
// actually is, showing the 220 ms delay and the fast-close / slow-open asymmetry.
export default function PupilStep2() {
	const mountRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const sceneRef = useRef<IrisScene | null>(null);

	const [lumLevel, setLumLevel] = useState<"dark" | "bright">("dark");
	const [latencyActive, setLatencyActive] = useState(true);

	const paramsRef = useRef({ targetLuminance: 1.0, latencyActive: true });
	useEffect(() => {
		paramsRef.current.targetLuminance = lumLevel === "bright" ? 1000 : 1;
		paramsRef.current.latencyActive = latencyActive;
	}, [lumLevel, latencyActive]);

	useEffect(() => {
		if (!mountRef.current) return;

		const s = createIrisScene(mountRef.current, {
			pupilRadius: 6.0 * (0.5 / 12.0),
			pigmentation: 1,
			showMuscles: false,
			stilesCrawford: false,
		});
		sceneRef.current = s;

		const history: { targetD: number; actualD: number; time: number }[] = [];
		const queue: { time: number; targetD: number }[] = [];
		let currentD = 6.0;

		const calcWatson = (L: number) => {
			const logL = Math.log10(Math.max(0.0001, L));
			return Math.min(8, Math.max(2, 4.9 - 3.0 * Math.tanh(0.4 * logL - 0.2)));
		};

		s.setOnFrame((dt) => {
			const now = performance.now() / 1000;
			const p = paramsRef.current;
			const targetD = calcWatson(p.targetLuminance);

			const delay = p.latencyActive ? 0.22 : 0.0;
			queue.push({ time: now, targetD });
			while (queue.length && queue[0].time < now - 1.0) queue.shift();
			let delayedTargetD = targetD;
			const targetTime = now - delay;
			for (let i = queue.length - 1; i >= 0; i--) {
				if (queue[i].time <= targetTime) {
					delayedTargetD = queue[i].targetD;
					break;
				}
			}

			const diff = delayedTargetD - currentD;
			if (Math.abs(diff) > 0.001) {
				const tau = diff < 0 ? 0.12 : 0.65;
				currentD += (diff / tau) * dt;
			}
			s.params.pupilRadius = currentD * (0.5 / 12.0);

			history.push({ targetD, actualD: currentD, time: now });
			while (history.length > 300) history.shift();

			const canvas = canvasRef.current;
			const ctx = canvas?.getContext("2d");
			if (canvas && ctx) {
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.strokeStyle = "rgba(120,130,150,0.25)";
				ctx.lineWidth = 1;
				for (let y = 0; y <= canvas.height; y += canvas.height / 4) {
					ctx.beginPath();
					ctx.moveTo(0, y);
					ctx.lineTo(canvas.width, y);
					ctx.stroke();
				}
				if (history.length > 1) {
					const t0 = history[0].time;
					const win = 4.0;
					const plot = (
						key: "targetD" | "actualD",
						color: string,
						width: number,
						dash: number[],
					) => {
						ctx.setLineDash(dash);
						ctx.strokeStyle = color;
						ctx.lineWidth = width;
						ctx.beginPath();
						history.forEach((pt, i) => {
							const x = ((pt.time - t0) / win) * canvas.width;
							const y = canvas.height - ((pt[key] - 1.5) / 7.0) * canvas.height;
							i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
						});
						ctx.stroke();
					};
					plot("targetD", "#f59e0b", 1.5, [4, 4]);
					plot("actualD", "#06b6d4", 2.5, []);
				}
			}

			const debugEl = mountRef.current
				?.closest(".interactive-viewer")
				?.querySelector(".debug-output");
			if (debugEl) {
				(debugEl as HTMLElement).innerText = JSON.stringify(
					{
						pupilDiameter: +currentD.toFixed(2),
						targetLuminance: p.targetLuminance,
						latencyActive: p.latencyActive,
					},
					null,
					2,
				);
			}
		});

		const canvasResize = new ResizeObserver(() => {
			if (!canvasRef.current) return;
			canvasRef.current.width =
				canvasRef.current.parentElement?.clientWidth || 400;
			canvasRef.current.height = 140;
		});
		if (canvasRef.current?.parentElement)
			canvasResize.observe(canvasRef.current.parentElement);

		return () => {
			canvasResize.disconnect();
			s.dispose();
			sceneRef.current = null;
		};
	}, []);

	return (
		<div className="relative w-full bg-transparent rounded-lg overflow-hidden flex flex-col gap-4 p-4">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[500px] md:h-[340px]">
				<div className="relative w-full h-full min-h-[240px] md:min-h-0 rounded-xl overflow-hidden bg-card/40 border border-border">
					<div
						ref={mountRef}
						className="absolute inset-0 cursor-grab active:cursor-grabbing"
					/>
					<div className="absolute top-2 left-2 z-10 bg-card/80 border border-border text-[10px] px-2 py-1 rounded text-primary font-bold">
						3D pupil
					</div>
				</div>

				<div className="relative w-full h-full min-h-[240px] md:min-h-0 rounded-xl overflow-hidden bg-card/60 border border-border p-3 flex flex-col justify-between">
					<div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
						<span>Reflex over time</span>
						<div className="flex items-center gap-3">
							<span className="text-amber-500">- - target</span>
							<span className="text-cyan-500">— actual</span>
						</div>
					</div>
					<div className="w-full my-auto">
						<canvas ref={canvasRef} className="w-full h-[140px]" />
					</div>
					<div className="flex justify-between text-[10px] text-muted-foreground font-mono">
						<span>4s ago</span>
						<span>2s</span>
						<span>now</span>
					</div>
				</div>
			</div>

			<div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card/70 border border-border p-3 rounded-xl">
				<div className="flex items-center gap-2">
					<span className="text-xs font-semibold text-foreground">Light:</span>
					<button
						onClick={() => setLumLevel("dark")}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${lumLevel === "dark" ? "bg-indigo-600 text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
					>
						Dark
					</button>
					<button
						onClick={() => setLumLevel("bright")}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${lumLevel === "bright" ? "bg-amber-400 text-black" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
					>
						Bright
					</button>
				</div>
				<button
					onClick={() => setLatencyActive(!latencyActive)}
					className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${latencyActive ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground"}`}
				>
					{latencyActive ? "220 ms delay: on" : "220 ms delay: off"}
				</button>
			</div>
		</div>
	);
}
