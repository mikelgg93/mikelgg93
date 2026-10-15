import { eyeText } from "../earlyText";
import ParameterControl, { useInitialParameters } from "../ParameterControl";
import { parameterContext } from "../parameterContext";
import { SCE_RHO_E, sceEffectiveArea } from "./pupilOptics";
import "./pupil.css";
import React, { useEffect, useRef, useState } from "react";
import { createIrisScene, type IrisScene } from "./irisScene";

// Parametric iris: drive the pupil and scene brightness by hand and read the
// light that reaches the retina (geometric area, trolands, and the effective
// area once the Stiles-Crawford edge falloff is included).
export default function IrisParametric({
	lang = "en",
}: {
	lang?: "en" | "es";
}) {
	const t = eyeText(lang);
	const mountRef = useRef<HTMLDivElement>(null);
	const sceneRef = useRef<IrisScene | null>(null);

	const [diameter, setDiameter] = useState(4.0);
	const [logL, setLogL] = useState(2); // log10 luminance, 100 cd/m^2
	const [stilesCrawford, setStilesCrawford] = useState(true);
	const [pigment, setPigment] = useState(0);

	const L = 10 ** logL;
	const area = (Math.PI * diameter * diameter) / 4;
	const effArea = sceEffectiveArea(diameter);
	const trolands = L * area;
	const effTrolands = L * effArea;
	const scEff = effArea / area;

	useEffect(() => {
		if (!mountRef.current) return;
		const s = createIrisScene(mountRef.current, {
			pupilRadius: 4.0 * (0.5 / 12.0),
			pigmentation: 0,
			showMuscles: false,
		});
		sceneRef.current = s;
		s.setDebug(() => ({
			diameter,
			diameterBasis: "Entrance pupil (illustrative)",
			sceRhoNaturalMmMinus2: SCE_RHO_E,
			area: +area.toFixed(1),
			trolands: +trolands.toFixed(0),
			effTrolands: +effTrolands.toFixed(0),
			scEfficiency: +scEff.toFixed(3),
		}));
		return () => {
			s.dispose();
			sceneRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		const s = sceneRef.current;
		if (!s) return;
		s.params.pupilRadius = diameter * (0.5 / 12.0);
		s.params.pigmentation = pigment;
		s.setDebug(() => ({
			diameter,
			diameterBasis: "Entrance pupil (illustrative)",
			sceRhoNaturalMmMinus2: SCE_RHO_E,
			area: +area.toFixed(1),
			trolands: +trolands.toFixed(0),
			effTrolands: +effTrolands.toFixed(0),
			scEfficiency: +scEff.toFixed(3),
		}));
	}, [diameter, stilesCrawford, pigment, area, trolands, effTrolands, scEff]);

	const fmt = (n: number) =>
		n >= 1000 ? n.toExponential(1) : n.toFixed(n < 10 ? 1 : 0);

	const defaults = useInitialParameters(
		{ diameter, logL, stilesCrawford, pigment },
		(initial) => {
			setDiameter(initial.diameter);
			setLogL(initial.logL);
			setStilesCrawford(initial.stilesCrawford);
			setPigment(initial.pigment);
		},
		mountRef,
	);
	return (
		<div className="pupil-demo relative w-full h-[500px] md:h-[580px] bg-transparent overflow-hidden rounded-lg group">
			{/* Metrics HUD */}
			<div className="pupil-metrics absolute top-4 left-4 right-4 z-10 grid grid-cols-2 md:grid-cols-3 gap-2 pointer-events-none">
				<div className="bg-card/80 backdrop-blur-md border border-border p-2.5 rounded-xl shadow-lg">
					<div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
						{t("Pupil area (A)")}
					</div>
					<div className="text-lg font-extrabold text-foreground">
						{area.toFixed(1)}{" "}
						<span className="text-xs font-semibold text-muted-foreground">
							mm²
						</span>
					</div>
				</div>
				<div className="bg-card/80 backdrop-blur-md border border-border p-2.5 rounded-xl shadow-lg">
					<div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
						{stilesCrawford
							? t("SCE-weighted illuminance")
							: t("Retinal illuminance")}
					</div>
					<div className="text-lg font-extrabold text-amber-500">
						{fmt(stilesCrawford ? effTrolands : trolands)}{" "}
						<span className="text-xs font-semibold text-muted-foreground">
							Td
						</span>
					</div>
				</div>
				<div className="col-span-2 md:col-span-1 bg-card/80 backdrop-blur-md border border-border p-2.5 rounded-xl shadow-lg">
					<div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
						{t("SCE-weighted area / area")}
					</div>
					<div className="text-lg font-extrabold text-emerald-500">
						{(scEff * 100).toFixed(0)}
						<span className="text-xs font-semibold text-muted-foreground">
							%
						</span>
					</div>
				</div>
			</div>

			{/* Controls */}
			<div className="pupil-controls absolute bottom-4 left-1/2 md:-translate-x-1/2 z-20 flex flex-col gap-2.5 bg-card/80 backdrop-blur-md border border-border p-3.5 rounded-2xl shadow-xl w-11/12 max-w-lg">
				<div className="flex items-center gap-3">
					<span className="text-xs font-semibold text-foreground min-w-[92px]">
						{t("Pupil")}{" "}
						<span className="font-mono text-primary font-bold">
							{diameter.toFixed(1)} mm
						</span>
					</span>
					<ParameterControl
						value={diameter}
						initial={defaults.diameter}
						onReset={setDiameter}
						label="pupil diameter"
						lang={lang}
						context={parameterContext.entrancePupil}
					>
						<input
							type="range"
							aria-label={t("Pupil diameter")}
							min="2"
							max="8"
							step="0.1"
							value={diameter}
							onChange={(e) => setDiameter(parseFloat(e.target.value))}
							className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
						/>
					</ParameterControl>
				</div>
				<div className="flex items-center gap-3">
					<span className="text-xs font-semibold text-foreground min-w-[92px]">
						{t("Light")}{" "}
						<span className="font-mono text-amber-500 font-bold">{fmt(L)}</span>
					</span>
					<ParameterControl
						value={logL}
						initial={defaults.logL}
						onReset={setLogL}
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
							value={logL}
							onChange={(e) => setLogL(parseFloat(e.target.value))}
							className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-amber-500"
						/>
					</ParameterControl>
				</div>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<ParameterControl
						value={stilesCrawford}
						initial={defaults.stilesCrawford}
						onReset={setStilesCrawford}
						label="SCE weighting"
						lang={lang}
						context={parameterContext.sce}
					>
						<button
							onClick={() => setStilesCrawford(!stilesCrawford)}
							className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${stilesCrawford ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
						>
							Stiles-Crawford {stilesCrawford ? t("on") : t("off")}
						</button>
					</ParameterControl>
					<ParameterControl
						value={pigment}
						initial={defaults.pigment}
						onReset={setPigment}
						label="iris pigmentation"
						lang={lang}
					>
						<select
							aria-label={t("Iris pigment")}
							value={pigment}
							onChange={(e) => setPigment(parseInt(e.target.value, 10))}
							className="bg-card text-foreground font-semibold text-xs px-2.5 py-1.5 rounded-lg border border-border focus:outline-none cursor-pointer"
						>
							<option value={0}>{t("Brown")}</option>
							<option value={1}>{t("Hazel")}</option>
							<option value={2}>{t("Blue")}</option>
							<option value={3}>{t("Albino")}</option>
						</select>
					</ParameterControl>
				</div>
			</div>

			<div
				ref={mountRef}
				className="pupil-scene w-full h-full cursor-grab active:cursor-grabbing"
			/>
		</div>
	);
}
