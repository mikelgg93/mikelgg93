import { useEffect, useRef, useState } from "react";
import { eyeText } from "../earlyText";
import { ParameterInfo, useInitialParameters } from "../ParameterControl";
import { parameterContext } from "../parameterContext";
import { createIrisScene, type IrisScene } from "./irisScene";
import "./pupil.css";

export default function PupilStep1({ lang = "en" }: { lang?: "en" | "es" }) {
	const t = eyeText(lang);
	const es = lang === "es";
	const mountRef = useRef<HTMLDivElement>(null);
	const sceneRef = useRef<IrisScene | null>(null);
	const [diameter, setDiameter] = useState(4);
	const [pigment, setPigment] = useState(1);
	const [reveal, setReveal] = useState(0.5);
	const [animate, setAnimate] = useState(true);
	const settings = useRef({ diameter, pigment, reveal, animate });
	settings.current = { diameter, pigment, reveal, animate };
	useEffect(() => {
		if (!mountRef.current) return;
		const s = createIrisScene(mountRef.current, {
			pupilRadius: 4 / 24,
			pigmentation: 1,
			showMuscles: true,
			muscleReveal: 0.5,
		});
		sceneRef.current = s;
		let current = 4;
		s.setOnFrame((dt, elapsed, reduced) => {
			const p = settings.current;
			// An illustrative repeating light response, not a physiological measurement.
			const phase = elapsed % 14;
			const bright = phase >= 6 && phase < 9;
			const target =
				p.animate && !reduced
					? Math.max(
							2,
							Math.min(
								8,
								p.diameter +
									0.12 * Math.sin(elapsed * 2.3) -
									(bright ? 1.4 : 0),
							),
						)
					: p.diameter;
			current =
				p.animate && !reduced
					? current +
						(target - current) *
							(1 - Math.exp(-dt / (target < current ? 0.35 : 1.1)))
					: target;
			s.params.pupilRadius = current / 24;
			s.params.pigmentation = p.pigment;
			s.params.muscleReveal = p.reveal;
		});
		s.setDebug(() => ({
			startingDiameterMm: settings.current.diameter,
			currentDiameterMm: current,
			muscleReveal: settings.current.reveal,
			motion: "Illustrative light-response cycle",
		}));
		return () => {
			s.dispose();
			sceneRef.current = null;
		};
	}, []);
	useInitialParameters(
		{ diameter, pigment, reveal, animate },
		(initial) => {
			setDiameter(initial.diameter);
			setPigment(initial.pigment);
			setReveal(initial.reveal);
			setAnimate(initial.animate);
		},
		mountRef,
	);
	return (
		<div className="pupil-demo pupil-anatomy relative w-full bg-transparent">
			<div className="iris-caption">
				<strong>{t("Iris Anatomy")}</strong>
				<p>
					{t("Two muscles set the pupil size: a circular")}{" "}
					<span className="text-rose-400">{t("sphincter")}</span>{" "}
					{t("that closes it and radial")}{" "}
					<span className="text-sky-400">{t("dilator")}</span>{" "}
					{t("fibers that open it.")}
				</p>
				<details className="eye-settings-inline">
					<summary>{es ? "Ajustes" : "Settings"}</summary>
					<label className="eye-setting-row">
						<span>
							{es ? "Diámetro inicial" : "Starting diameter"}{" "}
							<output>{diameter.toFixed(1)} mm</output>
						</span>
						<input
							type="range"
							aria-label={t("Pupil diameter")}
							min="2"
							max="8"
							step=".1"
							value={diameter}
							onChange={(e) => setDiameter(+e.target.value)}
						/>
					</label>
					<div className="flex items-center justify-between gap-2">
						<label>
							{t("Iris pigment")}{" "}
							<select
								value={pigment}
								onChange={(e) => setPigment(+e.target.value)}
							>
								{["Brown", "Hazel", "Blue", "Albino"].map((name, i) => (
									<option key={name} value={i}>
										{t(name)}
									</option>
								))}
							</select>
						</label>
						<ParameterInfo
							label="pupil diameter"
							context={parameterContext.pupil}
						/>
					</div>
					<label className="eye-checkbox">
						<input
							type="checkbox"
							checked={animate}
							onChange={(e) => setAnimate(e.target.checked)}
						/>
						{es
							? "Respuesta a la luz ilustrativa"
							: "Illustrative light response"}
					</label>
				</details>
			</div>
			<div className="iris-comparison">
				<div
					ref={mountRef}
					className="absolute inset-0 cursor-grab active:cursor-grabbing"
				/>
				<div className="comparison-labels">
					<span>{es ? "Músculos" : "Muscles"}</span>
					<span>{es ? "Superficie" : "Surface"}</span>
				</div>
				<button
					type="button"
					role="slider"
					aria-label={es ? "Mostrar músculos" : "Reveal muscles"}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={Math.round(reveal * 100)}
					aria-valuetext={`${Math.round(reveal * 100)}%`}
					className="muscle-divider"
					style={{ left: `${reveal * 100}%` }}
					onKeyDown={(event) => {
						const next =
							event.key === "Home"
								? 0
								: event.key === "End"
									? 1
									: event.key === "ArrowLeft"
										? reveal - 0.05
										: event.key === "ArrowRight"
											? reveal + 0.05
											: null;
						if (next !== null) {
							event.preventDefault();
							setReveal(Math.max(0, Math.min(1, next)));
						}
					}}
					onPointerDown={(event) => {
						event.currentTarget.setPointerCapture(event.pointerId);
					}}
					onPointerMove={(event) => {
						if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
						const rect =
							event.currentTarget.parentElement!.getBoundingClientRect();
						setReveal(
							Math.max(
								0,
								Math.min(1, (event.clientX - rect.left) / rect.width),
							),
						);
					}}
					onPointerUp={(event) =>
						event.currentTarget.releasePointerCapture(event.pointerId)
					}
				>
					<span aria-hidden="true">↔</span>
				</button>
			</div>
			<p className="comparison-note">
				{es
					? "Arrastra el divisor. El movimiento ilustra pequeños cambios y una respuesta a luz más intensa."
					: "Drag the divider. Motion illustrates small fluctuations and a response to brighter light."}
			</p>
		</div>
	);
}
