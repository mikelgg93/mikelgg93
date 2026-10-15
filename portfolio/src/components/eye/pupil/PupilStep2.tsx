import { eyeText } from "../earlyText";
import ParameterControl, { useInitialParameters } from "../ParameterControl";
import { parameterContext } from "../parameterContext";
import { SampleRing } from "./sampleRing";
import "./pupil.css";
import React, { useEffect, useRef, useState } from "react";
import { createIrisScene, type IrisScene } from "./irisScene";

// The pupillary light reflex, paired with an oscilloscope: the dashed line is
// the target diameter the reflex is chasing, the solid line is where the pupil
// actually is, showing the 220 ms delay and the fast-close / slow-open asymmetry.
export default function PupilStep2({ lang = "en" }: { lang?: "en" | "es" }) {
	const t = eyeText(lang);
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
		});
		sceneRef.current = s;

		const history = new SampleRing(2048);
		const queue = new SampleRing(256);
		let currentD = 6.0;

		const viewer = mountRef.current.closest(".interactive-viewer");
		const initialDiameter = currentD;
		const resetDynamics = () => {
			currentD = initialDiameter;
			queue.clear();
			history.clear();
		};
		viewer?.addEventListener("eye:reset", resetDynamics);

		const pupilFromLuminance = (L: number) => {
			const logL = Math.log10(Math.max(0.0001, L));
			return Math.min(8, Math.max(2, 4.9 - 3.0 * Math.tanh(0.4 * logL + 0.4)));
		};

		s.setDebug(() => ({
			model: "First-order PLR",
			pupilDiameterMm: +currentD.toFixed(3),
			targetLuminanceCdM2: paramsRef.current.targetLuminance,
			latencySeconds: paramsRef.current.latencyActive ? 0.22 : 0,
			constrictionTauSeconds: 0.12,
			dilationTauSeconds: 0.65,
		}));
		s.setOnFrame((dt, now) => {
			const p = paramsRef.current;
			const targetD = pupilFromLuminance(p.targetLuminance);

			const delay = p.latencyActive ? 0.22 : 0.0;
			queue.push(now, targetD);
			const delayedTargetD = queue.atOrBefore(now - delay, currentD);

			const diff = delayedTargetD - currentD;
			if (Math.abs(diff) > 0.001) {
				// Simulation time constants (seconds), not physiological constants.
				const tau = diff < 0 ? 0.12 : 0.65;
				currentD += diff * (1 - Math.exp(-dt / tau));
			}
			s.params.pupilRadius = currentD * (0.5 / 12.0);

			history.push(now, targetD, currentD);

			const canvas = canvasRef.current;
			const ctx = canvas?.getContext("2d");
			if (canvas && ctx) {
				const dpr = Math.min(window.devicePixelRatio || 1, 2);
				const width = canvas.width / dpr,
					height = canvas.height / dpr;
				ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
				ctx.clearRect(0, 0, width, height);
				ctx.strokeStyle = "rgba(120,130,150,0.25)";
				ctx.lineWidth = 1;
				for (let y = 0; y <= height; y += height / 4) {
					ctx.beginPath();
					ctx.moveTo(0, y);
					ctx.lineTo(width, y);
					ctx.stroke();
				}
				if (history.length > 1) {
					const t0 = now - 4;
					const win = 4.0;
					const plot = (
						key: "targetD" | "actualD",
						color: string,
						lineWidth: number,
						dash: number[],
					) => {
						ctx.setLineDash(dash);
						ctx.strokeStyle = color;
						ctx.lineWidth = lineWidth;
						ctx.beginPath();
						let started = false;
						for (let i = 0; i < history.length; i++) {
							const time = history.time(i);
							if (time < t0) continue;
							const x = ((time - t0) / win) * width;
							const y =
								height -
								((history.value(i, key === "targetD" ? 0 : 1) - 1.5) / 7) *
									height;
							if (started) ctx.lineTo(x, y);
							else ctx.moveTo(x, y);
							started = true;
						}
						ctx.stroke();
					};
					plot("targetD", "#f59e0b", 1.5, [4, 4]);
					plot("actualD", "#06b6d4", 2.5, []);
				}
			}
		});

		const canvasResize = new ResizeObserver(() => {
			if (!canvasRef.current) return;
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			canvasRef.current.width = Math.round(
				(canvasRef.current.parentElement?.clientWidth || 400) * dpr,
			);
			canvasRef.current.height = Math.round(140 * dpr);
		});
		if (canvasRef.current?.parentElement)
			canvasResize.observe(canvasRef.current.parentElement);

		return () => {
			viewer?.removeEventListener("eye:reset", resetDynamics);
			canvasResize.disconnect();
			s.dispose();
			sceneRef.current = null;
		};
	}, []);

	const defaults = useInitialParameters(
		{ lumLevel, latencyActive },
		(initial) => {
			setLumLevel(initial.lumLevel);
			setLatencyActive(initial.latencyActive);
		},
		mountRef,
	);
	return (
		<div className="pupil-demo relative w-full bg-transparent rounded-lg overflow-hidden flex flex-col gap-3 p-2 sm:gap-4 sm:p-4">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 md:h-[500px]">
				<div className="relative w-full aspect-square md:aspect-auto md:h-full rounded-xl overflow-hidden bg-card/40 border border-border">
					<div
						ref={mountRef}
						className="absolute inset-0 cursor-grab active:cursor-grabbing"
					/>
					<div className="absolute top-2 left-2 z-10 bg-card/80 border border-border text-[10px] px-2 py-1 rounded text-primary font-bold">
						{t("3D pupil")}
					</div>
				</div>

				<div className="relative w-full h-[200px] md:h-full rounded-xl overflow-hidden bg-card/60 border border-border p-3 flex flex-col justify-between">
					<div className="flex flex-wrap gap-2 justify-between items-center text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
						<span>{t("Reflex over time")}</span>
						<div className="flex items-center gap-3">
							<span className="text-amber-500">{t("- - target")}</span>
							<span className="text-cyan-500">{t("— actual")}</span>
						</div>
					</div>
					<div className="w-full my-auto">
						<canvas ref={canvasRef} className="w-full h-[140px]" />
					</div>
					<div className="flex justify-between text-[10px] text-muted-foreground font-mono">
						<span>{t("4s ago")}</span>
						<span>2s</span>
						<span>{t("now")}</span>
					</div>
				</div>
			</div>

			<div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card/70 border border-border p-3 rounded-xl">
				<ParameterControl
					value={lumLevel}
					initial={defaults.lumLevel}
					onReset={setLumLevel}
					label="light level"
					lang={lang}
					context={parameterContext.luminance}
				>
					<div className="flex items-center gap-2">
						<span className="text-xs font-semibold text-foreground">
							{t("Light:")}
						</span>
						<button
							onClick={() => setLumLevel("dark")}
							className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${lumLevel === "dark" ? "bg-indigo-600 text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
						>
							{t("Dark")}
						</button>
						<button
							onClick={() => setLumLevel("bright")}
							className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${lumLevel === "bright" ? "bg-amber-400 text-black" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
						>
							{t("Bright")}
						</button>
					</div>
				</ParameterControl>
				<ParameterControl
					value={latencyActive}
					initial={defaults.latencyActive}
					onReset={setLatencyActive}
					label="reflex delay"
					lang={lang}
					context={parameterContext.latency}
				>
					<button
						onClick={() => setLatencyActive(!latencyActive)}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${latencyActive ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground"}`}
					>
						{latencyActive ? t("220 ms delay: on") : t("220 ms delay: off")}
					</button>
				</ParameterControl>
			</div>
		</div>
	);
}
