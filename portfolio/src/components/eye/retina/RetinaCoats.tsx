import "../lens/lens.css";
import "./retina.css";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createLensScene } from "../lens/lensScene";
import { createPosteriorEye, eyeCoats } from "./posteriorEye";

export default function RetinaCoats({ lang = "en" }: { lang?: "en" | "es" }) {
	const es = lang === "es";
	const mount = useRef<HTMLDivElement>(null);
	const viewRef = useRef<ReturnType<typeof createLensScene> | null>(null);
	const replay = useRef<(() => void) | null>(null);
	const [paused, setPaused] = useState(false);
	const [finished, setFinished] = useState(false);
	const [stage, setStage] = useState(0);
	const [error, setError] = useState(false);
	const params = useRef({ paused });
	useEffect(() => {
		params.current = { paused };
		viewRef.current?.invalidate();
	}, [paused]);
	useEffect(() => {
		if (!mount.current) return;
		let view: ReturnType<typeof createLensScene>;
		try {
			view = createLensScene(mount.current, 52, lang);
		} catch {
			setError(true);
			return;
		}
		viewRef.current = view;
		view.camera.position.set(30, 24, 22);
		view.controls.target.set(0, 0, -8);
		// These are the final assembly's meshes, with unchanged scale and boundaries.
		const eye = createPosteriorEye();
		view.scene.add(eye.group);
		let elapsed = 0;
		let lastStage = -1;
		let ended = false;
		replay.current = () => {
			elapsed = 0;
			lastStage = -1;
			ended = false;
			params.current.paused = false;
			setPaused(false);
			setFinished(false);
			view.invalidate();
		};
		view.onReset(() => replay.current?.());
		view.start((dt, reduced) => {
			const fov = view.camera.aspect < 1.2 ? 50 : 35;
			if (view.camera.fov !== fov) {
				view.camera.fov = fov;
				view.camera.updateProjectionMatrix();
			}
			if (!params.current.paused && !ended && !reduced) elapsed += dt;
			const next = reduced || ended ? 3 : Math.min(3, Math.floor(elapsed / 3));
			if (next !== lastStage) {
				lastStage = next;
				setStage(next);
			}
			if (!ended && (reduced || elapsed >= 12)) {
				ended = true;
				setFinished(true);
			}
			eye.update(
				true,
				{ choroid: next >= 1, sclera: next >= 2, nerve: next >= 3 },
				false,
			);
			return {
				animating: !reduced && !ended && !params.current.paused,
				state: {
					model:
						"Shared assembly coats; schematic tissue walls, not measured histology",
					stage: next,
					coats: eyeCoats.slice(0, Math.min(next + 1, 3)).map((c) => ({
						tissue: c.key,
						posteriorWidthMm: c.outer - c.inner,
					})),
					nerve: next >= 3,
				},
			};
		});
		return () => {
			replay.current = null;
			viewRef.current = null;
			view.dispose();
		};
	}, [lang]);
	const captions = es
		? [
				"1. Cerramos la pared retiniana con una superficie interna y otra externa.",
				"2. La coroides empieza en el límite externo de la retina: no dejamos un hueco entre ambas.",
				"3. La esclerótica envuelve la coroides. Las caras del corte dejan ver las tres paredes.",
				"4. El nervio atraviesa la abertura nasal que ya comparten las cubiertas, a un lado de la fóvea.",
			]
		: [
				"1. Close the retinal wall with an inner and an outer surface.",
				"2. Start the choroid at the outer retinal boundary, leaving no gap between them.",
				"3. Wrap the choroid in sclera. Cut faces reveal the three walls.",
				"4. Pass the nerve through the shared nasal opening, beside the fovea.",
			];
	return (
		<div className="lens-demo retina-demo">
			<div className="lens-heading">
				<strong>
					{es
						? "De una cúpula a tres cubiertas"
						: "From one cup to three coats"}
				</strong>
				<span className="lens-muted">
					{es ? "Mallas del conjunto final" : "The final assembly’s meshes"}
				</span>
			</div>
			<div
				className="lens-scene"
				ref={mount}
				role="img"
				aria-label={
					es
						? "Construcción por etapas de retina, coroides, esclerótica y nervio óptico"
						: "Staged construction of retina, choroid, sclera and optic nerve"
				}
			>
				{error && (
					<p role="status">
						{es ? "WebGL no está disponible." : "WebGL is unavailable."}
					</p>
				)}
			</div>
			<p className="retina-reading" aria-live="polite">
				{captions[stage]}
			</p>
			<div className="retina-coat-section">
				<p>
					{es
						? "Espesores posteriores elegidos, fuera de la fosita · esquema ampliado"
						: "Chosen posterior wall thicknesses, away from the pit · magnified diagram"}
				</p>
				<div
					className="retina-coat-strip"
					role="img"
					aria-label={
						es
							? "Retina 0,30 mm; coroides 0,40 mm; esclerótica 0,70 mm"
							: "Retina 0.30 mm; choroid 0.40 mm; sclera 0.70 mm"
					}
				>
					{eyeCoats.map((coat, i) => (
						<span
							key={coat.key}
							style={{
								flex: coat.outer - coat.inner,
								background: coat.color,
								opacity: stage >= i ? 1 : 0.15,
							}}
						/>
					))}
				</div>
				<ul className="retina-bands">
					{eyeCoats.map((coat, i) => (
						<li key={coat.key} style={{ opacity: stage >= i ? 1 : 0.4 }}>
							<span className="retina-dot" style={{ background: coat.color }} />
							{es ? coat.es : coat.en} {(coat.outer - coat.inner).toFixed(2)} mm
						</li>
					))}
				</ul>
				<p>
					{es
						? "El límite retina–coroides representa el EPR. La membrana de Bruch y las subdivisiones vasculares no se dibujan por separado."
						: "The retina–choroid boundary represents the RPE. Bruch’s membrane and vascular subdivisions are not drawn separately."}
				</p>
			</div>
			<div className="lens-controls">
				<button
					type="button"
					className="lens-motion-pause"
					aria-pressed={finished ? undefined : paused}
					onClick={() => (finished ? replay.current?.() : setPaused(!paused))}
				>
					{finished ? (
						<RotateCcw size={14} aria-hidden="true" />
					) : paused ? (
						<Play size={14} aria-hidden="true" />
					) : (
						<Pause size={14} aria-hidden="true" />
					)}
					{finished
						? es
							? "Repetir"
							: "Replay"
						: paused
							? es
								? "Continuar"
								: "Resume"
							: es
								? "Pausar"
								: "Pause"}
				</button>
			</div>
		</div>
	);
}
