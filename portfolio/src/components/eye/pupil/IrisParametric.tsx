import React, { useEffect, useRef, useState } from "react";
import { createIrisScene, type IrisScene } from "./irisScene";

// Parametric iris: drive the pupil and scene brightness by hand and read the
// light that reaches the retina (geometric area, trolands, and the effective
// area once the Stiles-Crawford edge falloff is included).
export default function IrisParametric() {
	const mountRef = useRef<HTMLDivElement>(null);
	const sceneRef = useRef<IrisScene | null>(null);

	const [diameter, setDiameter] = useState(4.0);
	const [logL, setLogL] = useState(2); // log10 luminance, 100 cd/m^2
	const [stilesCrawford, setStilesCrawford] = useState(true);
	const [pigment, setPigment] = useState(1);

	const L = 10 ** logL;
	const area = (Math.PI * diameter * diameter) / 4;
	const rho = 0.085;
	const effArea =
		(Math.PI / rho) * (1 - Math.exp((-rho * diameter * diameter) / 4));
	const trolands = L * area;
	const effTrolands = L * effArea;
	const scEff = effArea / area;

	useEffect(() => {
		if (!mountRef.current) return;
		const s = createIrisScene(mountRef.current, {
			pupilRadius: 4.0 / 24,
			pigmentation: 1,
			showMuscles: false,
			stilesCrawford: true,
		});
		sceneRef.current = s;
		s.setDebug(() => ({
			diameter,
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
		s.params.pupilRadius = diameter / 24;
		s.params.stilesCrawford = stilesCrawford;
		s.params.pigmentation = pigment;
		s.setDebug(() => ({
			diameter,
			area: +area.toFixed(1),
			trolands: +trolands.toFixed(0),
			effTrolands: +effTrolands.toFixed(0),
			scEfficiency: +scEff.toFixed(3),
		}));
	}, [diameter, stilesCrawford, pigment, area, trolands, effTrolands, scEff]);

	const fmt = (n: number) =>
		n >= 1000 ? n.toExponential(1) : n.toFixed(n < 10 ? 1 : 0);

	return (
		<div className="relative w-full h-[500px] md:h-[580px] bg-transparent overflow-hidden rounded-lg group">
			{/* Metrics HUD */}
			<div className="absolute top-4 left-4 right-4 z-10 grid grid-cols-2 md:grid-cols-3 gap-2 pointer-events-none">
				<div className="bg-card/80 backdrop-blur-md border border-border p-2.5 rounded-xl shadow-lg">
					<div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
						Pupil area (A)
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
						Retinal illuminance
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
						Edge efficiency (Ae/A)
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
			<div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col gap-2.5 bg-card/80 backdrop-blur-md border border-border p-3.5 rounded-2xl shadow-xl w-11/12 max-w-lg">
				<div className="flex items-center gap-3">
					<span className="text-xs font-semibold text-foreground min-w-[92px]">
						Pupil{" "}
						<span className="font-mono text-primary font-bold">
							{diameter.toFixed(1)} mm
						</span>
					</span>
					<input
						type="range"
						min="2"
						max="8"
						step="0.1"
						value={diameter}
						onChange={(e) => setDiameter(parseFloat(e.target.value))}
						className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
					/>
				</div>
				<div className="flex items-center gap-3">
					<span className="text-xs font-semibold text-foreground min-w-[92px]">
						Light{" "}
						<span className="font-mono text-amber-500 font-bold">{fmt(L)}</span>
					</span>
					<input
						type="range"
						min="-2"
						max="4"
						step="0.05"
						value={logL}
						onChange={(e) => setLogL(parseFloat(e.target.value))}
						className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-amber-500"
					/>
				</div>
				<div className="flex items-center justify-between gap-2">
					<button
						onClick={() => setStilesCrawford(!stilesCrawford)}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${stilesCrawford ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
					>
						Stiles-Crawford {stilesCrawford ? "on" : "off"}
					</button>
					<select
						value={pigment}
						onChange={(e) => setPigment(parseInt(e.target.value))}
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
				className="w-full h-full cursor-grab active:cursor-grabbing"
			/>
		</div>
	);
}
