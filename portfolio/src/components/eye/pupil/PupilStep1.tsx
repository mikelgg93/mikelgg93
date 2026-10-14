import { eyeText } from "../earlyText";
import ParameterControl, { useInitialParameters } from "../ParameterControl";
import { parameterContext } from "../parameterContext";
import "./pupil.css";
import React, { useEffect, useRef, useState } from "react";
import { createIrisScene, type IrisScene } from "./irisScene";

// Anatomic iris: a 3D dished iris under a glassy cornea, with a toggle that
// reveals the two muscle systems (circular sphincter, radial dilator).
export default function PupilStep1({ lang = "en" }: { lang?: "en" | "es" }) {
	const t = eyeText(lang);
	const mountRef = useRef<HTMLDivElement>(null);
	const sceneRef = useRef<IrisScene | null>(null);

	const [diameter, setDiameter] = useState(4.0);
	const [showMuscles, setShowMuscles] = useState(true);
	const [pigment, setPigment] = useState(1);

	useEffect(() => {
		if (!mountRef.current) return;
		const s = createIrisScene(mountRef.current, {
			pupilRadius: 4.0 * (0.5 / 12.0),
			pigmentation: 1,
			showMuscles: true,
			stilesCrawford: false,
		});
		sceneRef.current = s;
		return () => {
			s.dispose();
			sceneRef.current = null;
		};
	}, []);

	useEffect(() => {
		const s = sceneRef.current;
		if (!s) return;
		s.params.pupilRadius = diameter * (0.5 / 12.0);
		s.params.showMuscles = showMuscles;
		s.params.pigmentation = pigment;
		s.invalidate();
	}, [diameter, showMuscles, pigment]);

	const defaults = useInitialParameters(
		{ diameter, showMuscles, pigment },
		(initial) => {
			setDiameter(initial.diameter);
			setShowMuscles(initial.showMuscles);
			setPigment(initial.pigment);
		},
		mountRef,
	);
	return (
		<div className="pupil-demo relative w-full h-[450px] md:h-[550px] bg-transparent overflow-hidden rounded-lg group">
			<div className="pupil-metrics absolute top-4 left-4 z-10 flex flex-col items-start gap-1 pointer-events-none bg-card/80 backdrop-blur-md border border-border p-3 rounded-xl shadow-lg max-w-[240px]">
				<span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1 border-b border-border/50 pb-1 w-full text-center">
					{t("Iris Anatomy")}
				</span>
				<div className="text-[11px] text-muted-foreground leading-snug">
					{t("Two muscles set the pupil size: a circular")}{" "}
					<span className="text-rose-400 font-semibold">{t("sphincter")}</span>{" "}
					{t("that closes it and radial")}{" "}
					<span className="text-sky-400 font-semibold">{t("dilator")}</span>{" "}
					{t("fibers that open it.")}
				</div>
			</div>

			<div className="pupil-controls absolute bottom-4 left-1/2 md:-translate-x-1/2 z-20 flex flex-col md:flex-row items-center gap-3 bg-card/80 backdrop-blur-md border border-border p-3 rounded-2xl shadow-xl w-11/12 max-w-lg">
				<div className="flex items-center gap-3 w-full md:flex-1">
					<span className="text-xs font-semibold text-foreground whitespace-nowrap">
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
						context={parameterContext.pupil}
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
				<div className="flex flex-wrap items-center gap-2">
					<ParameterControl
						value={showMuscles}
						initial={defaults.showMuscles}
						onReset={setShowMuscles}
						label="muscle overlay"
						lang={lang}
					>
						<button
							onClick={() => setShowMuscles(!showMuscles)}
							className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${showMuscles ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
						>
							{showMuscles ? t("Muscles on") : t("Muscles off")}
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
