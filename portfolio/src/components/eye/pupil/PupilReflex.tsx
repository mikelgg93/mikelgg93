import { eyeText } from "../earlyText";
import ParameterControl, { useInitialParameters } from "../ParameterControl";
import { parameterContext } from "../parameterContext";
import "./pupil.css";
import React, { useEffect, useRef, useState } from "react";
import { createIrisScene, type IrisScene } from "./irisScene";

export type PigmentationType = "brown" | "hazel" | "blue" | "albino";
const PIGMENTATION_MAP: Record<PigmentationType, number> = {
	brown: 0,
	hazel: 1,
	blue: 2,
	albino: 3,
};

export default function PupilReflex({ lang = "en" }: { lang?: "en" | "es" }) {
	const t = eyeText(lang);
	const mountRef = useRef<HTMLDivElement>(null);
	const sceneRef = useRef<IrisScene | null>(null);

	const [luminance, setLuminance] = useState(100.0);
	const [baselineOffset, setBaselineOffset] = useState(0.0);
	const [stilesCrawford, setStilesCrawford] = useState(true);
	const [pigmentation, setPigmentation] = useState<PigmentationType>("blue");
	const [isFlashActive, setIsFlashActive] = useState(false);

	const [hud, setHud] = useState({
		luminance: 100.0,
		steadyDiameter: 4.5,
		actualDiameter: 4.5,
		trolands: 1590,
		effectiveTrolands: 1420,
		scEfficiency: 0.893,
		kineticState: "Steady state",
	});

	const paramsRef = useRef({
		luminance: 100.0,
		baselineOffset: 0.0,
		stilesCrawford: true,
		pigmentation: "blue" as PigmentationType,
		flashUntilTime: 0,
	});
	useEffect(() => {
		paramsRef.current.luminance = luminance;
		paramsRef.current.baselineOffset = baselineOffset;
		paramsRef.current.stilesCrawford = stilesCrawford;
		paramsRef.current.pigmentation = pigmentation;
	}, [luminance, baselineOffset, stilesCrawford, pigmentation]);

	const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const handleFlash = () => {
		paramsRef.current.flashUntilTime = performance.now() / 1000 + 0.6;
		setIsFlashActive(true);
		if (flashTimerRef.current !== null) clearTimeout(flashTimerRef.current);
		flashTimerRef.current = setTimeout(() => setIsFlashActive(false), 600);
	};

	useEffect(() => {
		if (!mountRef.current) return;
		const s = createIrisScene(mountRef.current, {
			pupilRadius: 4.5 * (0.5 / 12.0),
			pigmentation: 1,
			showMuscles: false,
			stilesCrawford: true,
		});
		sceneRef.current = s;

		const queue: { time: number; targetDiameter: number }[] = [];
		let currentDiameter = 4.5;
		let lastHud = -Infinity;
		let debugState: Record<string, unknown> = {};
		s.setDebug(() => ({
			model: "First-order PLR",
			latencySeconds: 0.22,
			constrictionTauSeconds: 0.12,
			dilationTauSeconds: 0.65,
			...debugState,
		}));

		const viewer = mountRef.current.closest(".interactive-viewer");
		const initialDiameter = currentDiameter;
		const resetDynamics = () => {
			currentDiameter = initialDiameter;
			queue.length = 0;
			lastHud = -Infinity;
			paramsRef.current.flashUntilTime = 0;
			if (flashTimerRef.current !== null) clearTimeout(flashTimerRef.current);
			setIsFlashActive(false);
		};
		viewer?.addEventListener("eye:reset", resetDynamics);

		const pupilFromLuminance = (L: number, offset: number) => {
			const d =
				4.9 - 3.0 * Math.tanh(0.4 * Math.log10(Math.max(0.0001, L)) + 0.4);
			return Math.min(8, Math.max(2, d + offset));
		};

		s.setOnFrame((dt, elapsed, reducedMotion) => {
			const now = performance.now() / 1000;
			const p = paramsRef.current;
			const isFlashing = now < p.flashUntilTime;
			const L = isFlashing ? 10000 : p.luminance;

			const targetSteadyD = pupilFromLuminance(L, p.baselineOffset);
			queue.push({ time: elapsed, targetDiameter: targetSteadyD });
			const targetTime = elapsed - 0.22;
			while (queue.length && queue[0]!.time < targetTime - 0.5) queue.shift();
			let delayedTargetD = currentDiameter;
			for (let i = queue.length - 1; i >= 0; i--) {
				if (queue[i]!.time <= targetTime) {
					delayedTargetD = queue[i]!.targetDiameter;
					break;
				}
			}

			let kineticState = "Steady state";
			const diff = delayedTargetD - currentDiameter;
			if (isFlashing) kineticState = "Flash (fast close)";
			if (Math.abs(diff) > 0.01) {
				if (diff < 0) {
					currentDiameter += diff * (1 - Math.exp(-dt / 0.12));
					if (!isFlashing) kineticState = "Constricting";
				} else {
					currentDiameter += diff * (1 - Math.exp(-dt / 0.65));
					kineticState = "Dilating";
				}
			}

			const hippus = reducedMotion
				? 0
				: 0.12 * Math.sin(2 * Math.PI * 0.18 * elapsed) +
					0.07 * Math.sin(2 * Math.PI * 0.35 * elapsed + 1.1) +
					0.04 * Math.cos(2 * Math.PI * 0.48 * elapsed);
			const actualD = Math.min(8, Math.max(1.8, currentDiameter + hippus));

			const area = (Math.PI * actualD * actualD) / 4;
			const trolands = L * area;
			// Centered Gaussian SCE weighting exp(-rho*r²); illustrative coefficient in mm⁻².
			const rho = 0.085;
			const effArea =
				(Math.PI / rho) * (1 - Math.exp((-rho * actualD * actualD) / 4));
			const effTrolands = L * effArea;
			const scEfficiency = effArea / area;

			s.params.pupilRadius = actualD * (0.5 / 12.0);
			s.params.pigmentation = PIGMENTATION_MAP[p.pigmentation];
			s.params.stilesCrawford = p.stilesCrawford;

			if (now - lastHud > 0.05) {
				lastHud = now;
				setHud({
					luminance: L,
					steadyDiameter: targetSteadyD,
					actualDiameter: actualD,
					trolands,
					effectiveTrolands: effTrolands,
					scEfficiency,
					kineticState,
				});
				debugState = {
					actualDiameterMm: +actualD.toFixed(3),
					steadyTargetMm: +targetSteadyD.toFixed(3),
					luminanceCdM2: L,
					trolands,
					effectiveTrolands: effTrolands,
					kineticState,
					illustrativeHippus: !reducedMotion,
				};
			}
		});

		return () => {
			viewer?.removeEventListener("eye:reset", resetDynamics);
			if (flashTimerRef.current !== null) clearTimeout(flashTimerRef.current);
			s.dispose();
			sceneRef.current = null;
		};
	}, []);

	const fmt = (n: number) => (n >= 1000 ? n.toExponential(1) : n.toFixed(1));

	const defaults = useInitialParameters(
		{ luminance, baselineOffset, stilesCrawford, pigmentation },
		(initial) => {
			setLuminance(initial.luminance);
			setBaselineOffset(initial.baselineOffset);
			setStilesCrawford(initial.stilesCrawford);
			setPigmentation(initial.pigmentation);
		},
		mountRef,
	);
	return (
		<div className="pupil-demo relative w-full h-[580px] bg-transparent overflow-hidden rounded-lg group">
			<div
				ref={mountRef}
				className="pupil-scene absolute inset-0 cursor-grab active:cursor-grabbing z-0"
			/>

			{/* Metrics HUD */}
			<div className="pupil-metrics absolute top-4 left-4 right-4 z-10 grid grid-cols-2 md:grid-cols-4 gap-2.5 pointer-events-none">
				<div className="bg-card/80 backdrop-blur-md border border-border p-3 rounded-xl shadow-lg">
					<div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
						{t("Pupil diameter")}
					</div>
					<div className="flex flex-wrap items-baseline gap-1.5 mt-0.5">
						<span className="text-xl font-extrabold text-primary">
							{hud.actualDiameter.toFixed(2)}
						</span>
						<span className="text-xs text-muted-foreground">mm</span>
					</div>
					<div className="text-[10px] text-muted-foreground mt-0.5">
						{t("Target:")} {hud.steadyDiameter.toFixed(2)} mm
					</div>
				</div>
				<div className="bg-card/80 backdrop-blur-md border border-border p-3 rounded-xl shadow-lg">
					<div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
						{t("Retinal light")}
					</div>
					<div className="flex flex-wrap items-baseline gap-1.5 mt-0.5">
						<span className="text-xl font-extrabold text-amber-500">
							{(stilesCrawford ? hud.effectiveTrolands : hud.trolands).toFixed(
								0,
							)}
						</span>
						<span className="text-xs text-muted-foreground">Td</span>
					</div>
					<div className="text-[10px] text-muted-foreground mt-0.5">
						{stilesCrawford
							? `Stiles-Crawford (${(hud.scEfficiency * 100).toFixed(0)}%)`
							: t("Geometric E = L·A")}
					</div>
				</div>
				<div className="bg-card/80 backdrop-blur-md border border-border p-3 rounded-xl shadow-lg">
					<div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
						{t("Scene luminance")}
					</div>
					<div className="flex flex-wrap items-baseline gap-1.5 mt-0.5">
						<span className="text-xl font-extrabold text-yellow-500">
							{fmt(hud.luminance)}
						</span>
						<span className="text-xs text-muted-foreground">cd/m²</span>
					</div>
				</div>
				<div className="bg-card/80 backdrop-blur-md border border-border p-3 rounded-xl shadow-lg">
					<div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
						{t("Reflex state")}
					</div>
					<div className="text-sm font-bold text-emerald-500 mt-1 truncate">
						{t(hud.kineticState)}
					</div>
					<div className="text-[10px] text-muted-foreground mt-0.5">
						{t("Model delay 220 ms")}
					</div>
				</div>
			</div>

			{/* Controls */}
			<div className="pupil-controls absolute bottom-4 left-4 right-4 z-20 bg-card/80 backdrop-blur-md border border-border p-4 rounded-2xl shadow-xl flex flex-col gap-3">
				<div className="flex flex-col md:flex-row md:items-center gap-4">
					<div className="flex-1 flex flex-col gap-1">
						<div className="flex flex-wrap gap-1 justify-between items-center text-xs font-semibold">
							<span className="text-foreground flex items-center gap-1.5">
								<span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />{" "}
								{t("Scene luminance (L)")}
							</span>
							<span className="font-mono text-yellow-500 font-bold">
								{luminance.toFixed(1)} cd/m²
							</span>
						</div>
						<ParameterControl
							value={luminance}
							initial={defaults.luminance}
							onReset={setLuminance}
							label="luminance"
							lang={lang}
							context={parameterContext.luminance}
						>
							<input
								type="range"
								aria-label={t("Scene luminance")}
								min="-2"
								max="4"
								step="0.05"
								value={Math.log10(Math.max(0.01, luminance))}
								onChange={(e) => setLuminance(10 ** parseFloat(e.target.value))}
								className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-yellow-500"
							/>
						</ParameterControl>
						<div className="flex justify-between text-[9px] text-muted-foreground font-mono">
							<span>{t("starlight")}</span>
							<span>{t("moonlight")}</span>
							<span>{t("indoor")}</span>
							<span>{t("sunlight")}</span>
						</div>
					</div>
					<button
						onClick={handleFlash}
						disabled={isFlashActive}
						className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${isFlashActive ? "bg-yellow-400 text-black" : "bg-primary text-primary-foreground hover:opacity-90"}`}
					>
						{isFlashActive ? t("Flashing...") : t("Penlight flash")}
					</button>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-border/60 pt-3">
					<div className="flex flex-col gap-1">
						<div className="flex justify-between items-center text-xs">
							<span className="text-muted-foreground text-[11px]">
								{t("Baseline offset")}
							</span>
							<span className="font-mono text-primary font-bold text-[11px]">
								{baselineOffset >= 0
									? `+${baselineOffset.toFixed(1)}`
									: baselineOffset.toFixed(1)}{" "}
								mm
							</span>
						</div>
						<ParameterControl
							value={baselineOffset}
							initial={defaults.baselineOffset}
							onReset={setBaselineOffset}
							label="diameter offset"
							lang={lang}
							context={parameterContext.cognitive}
						>
							<input
								type="range"
								aria-label={t("Baseline pupil offset")}
								min="-1"
								max="1"
								step="0.1"
								value={baselineOffset}
								onChange={(e) => setBaselineOffset(parseFloat(e.target.value))}
								className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
							/>
						</ParameterControl>
					</div>
					<div className="flex items-center justify-between bg-background/50 p-2 rounded-xl border border-border">
						<span className="text-[11px] font-medium text-foreground">
							Stiles-Crawford
						</span>
						<ParameterControl
							value={stilesCrawford}
							initial={defaults.stilesCrawford}
							onReset={setStilesCrawford}
							label="SCE weighting"
							lang={lang}
							context={parameterContext.sce}
						>
							<button
								aria-label={t("Stiles-Crawford effect")}
								aria-pressed={stilesCrawford}
								onClick={() => setStilesCrawford(!stilesCrawford)}
								className="inline-flex h-5 w-9 items-center justify-center"
							>
								<span
									className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${stilesCrawford ? "bg-emerald-500" : "bg-secondary"}`}
								>
									<span
										className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${stilesCrawford ? "translate-x-4.5" : "translate-x-1"}`}
									/>
								</span>
							</button>
						</ParameterControl>
					</div>
					<div className="flex items-center justify-between bg-background/50 p-2 rounded-xl border border-border">
						<span className="text-[11px] font-medium text-foreground">
							{t("Iris pigment")}
						</span>
						<ParameterControl
							value={pigmentation}
							initial={defaults.pigmentation}
							onReset={setPigmentation}
							label="iris pigmentation"
							lang={lang}
						>
							<select
								aria-label={t("Iris pigment")}
								value={pigmentation}
								onChange={(e) =>
									setPigmentation(e.target.value as PigmentationType)
								}
								className="bg-card text-foreground font-semibold text-[11px] px-2 py-1 rounded-lg border border-border focus:outline-none cursor-pointer"
							>
								<option value="hazel">{t("Hazel")}</option>
								<option value="brown">{t("Brown")}</option>
								<option value="blue">{t("Blue")}</option>
								<option value="albino">{t("Albino")}</option>
							</select>
						</ParameterControl>
					</div>
				</div>
			</div>
		</div>
	);
}
