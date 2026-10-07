import "./pupil.css";
import React, { useEffect, useRef, useState } from "react";
import { createIrisScene, type IrisScene } from "./irisScene";

// Anatomic iris: a 3D dished iris under a glassy cornea, with a toggle that
// reveals the two muscle systems (circular sphincter, radial dilator).
export default function PupilStep1() {
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
	}, [diameter, showMuscles, pigment]);

	return (
		<div className="pupil-demo relative w-full h-[450px] md:h-[550px] bg-transparent overflow-hidden rounded-lg group">
			<div className="pupil-metrics absolute top-4 left-4 z-10 flex flex-col items-start gap-1 pointer-events-none bg-card/80 backdrop-blur-md border border-border p-3 rounded-xl shadow-lg max-w-[240px]">
				<span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1 border-b border-border/50 pb-1 w-full text-center">
					Iris Anatomy
				</span>
				<div className="text-[11px] text-muted-foreground leading-snug">
					Two muscles set the pupil size: a circular{" "}
					<span className="text-rose-400 font-semibold">sphincter</span> that
					closes it and radial{" "}
					<span className="text-sky-400 font-semibold">dilator</span> fibers
					that open it.
				</div>
			</div>

			<div className="pupil-controls absolute bottom-4 left-1/2 md:-translate-x-1/2 z-20 flex flex-col md:flex-row items-center gap-3 bg-card/80 backdrop-blur-md border border-border p-3 rounded-2xl shadow-xl w-11/12 max-w-lg">
				<div className="flex items-center gap-3 w-full md:flex-1">
					<span className="text-xs font-semibold text-foreground whitespace-nowrap">
						Pupil{" "}
						<span className="font-mono text-primary font-bold">
							{diameter.toFixed(1)} mm
						</span>
					</span>
					<input
						type="range"
						aria-label="Pupil diameter"
						min="2"
						max="8"
						step="0.1"
						value={diameter}
						onChange={(e) => setDiameter(parseFloat(e.target.value))}
						className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
					/>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<button
						onClick={() => setShowMuscles(!showMuscles)}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${showMuscles ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
					>
						{showMuscles ? "Muscles on" : "Muscles off"}
					</button>
					<select
						aria-label="Iris pigment"
						value={pigment}
						onChange={(e) => setPigment(parseInt(e.target.value, 10))}
						className="bg-card text-foreground font-semibold text-xs px-2.5 py-1.5 rounded-lg border border-border focus:outline-none cursor-pointer"
					>
						<option value={0}>Brown</option>
						<option value={1}>Hazel</option>
						<option value={2}>Blue</option>
						<option value={3}>Albino</option>
					</select>
				</div>
			</div>

			<div
				ref={mountRef}
				className="pupil-scene w-full h-full cursor-grab active:cursor-grabbing"
			/>
		</div>
	);
}
