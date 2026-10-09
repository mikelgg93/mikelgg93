import "./lens.css";
import { useEffect, useRef, useState } from "react";
import { createCiliaryApparatus } from "./ciliaryApparatus";
import LensViews from "./LensViews";
import { MAX_ACCOMMODATION } from "./lensModel";
import { createLensScene } from "./lensScene";

export default function LensAnatomy({ lang = "en" }: { lang?: "en" | "es" }) {
	const es = lang === "es";
	const mount = useRef<HTMLDivElement>(null);
	const viewRef = useRef<ReturnType<typeof createLensScene> | null>(null);
	const [accommodation, setAccommodation] = useState(0);
	const [cutaway, setCutaway] = useState(false);
	const [fibreMap, setFibreMap] = useState(false);
	const [error, setError] = useState(false);
	const params = useRef({ accommodation, cutaway, fibreMap });
	useEffect(() => {
		params.current = { accommodation, cutaway, fibreMap };
		viewRef.current?.invalidate();
	}, [accommodation, cutaway, fibreMap]);
	useEffect(() => {
		if (!mount.current) return;
		let view: ReturnType<typeof createLensScene>;
		try {
			view = createLensScene(mount.current, 30, lang);
		} catch {
			setError(true);
			return;
		}
		viewRef.current = view;
		view.camera.position.set(16, 12, 22);
		const apparatus = createCiliaryApparatus();
		view.scene.add(apparatus.group);
		let shown = params.current.accommodation;
		view.start((dt, reducedMotion) => {
			const p = params.current;
			shown +=
				(p.accommodation - shown) *
				(reducedMotion ? 1 : 1 - Math.exp(-dt / 0.25));
			if (Math.abs(p.accommodation - shown) < 1e-4) shown = p.accommodation;
			const shape = apparatus.update(shown, p.cutaway, p.fibreMap);
			return {
				state: {
					model: "Illustrative smooth-muscle bundles and zonular suspension",
					accommodation: shown,
					...shape,
					fibreMap: p.fibreMap,
					cutaway: p.cutaway,
				},
				animating: shown !== p.accommodation,
			};
		});
		return () => {
			viewRef.current = null;
			view.dispose();
		};
	}, [lang]);
	return (
		<div className="lens-demo">
			<div className="lens-heading">
				<strong>
					{es
						? "Músculo ciliar y suspensión zonular"
						: "Ciliary muscle and zonular suspension"}
				</strong>
				<span className="lens-muted">
					{es ? "Arrastra para girar" : "Drag to orbit"}
				</span>
			</div>
			{error ? (
				<p className="p-4" role="status">
					{es ? "WebGL no está disponible." : "WebGL is unavailable."}
				</p>
			) : (
				<div
					ref={mount}
					className="lens-scene"
					role="img"
					aria-label={
						es
							? "Músculo ciliar con fibras longitudinales, radiales y circulares, procesos ciliares y zónulas"
							: "Ciliary muscle with longitudinal, radial and circular fibres, ciliary processes and zonules"
					}
				/>
			)}
			<div className="lens-legend">
				{fibreMap ? (
					<>
						<span style={{ color: "#d4a1bb" }}>Longitudinal</span>
						<span style={{ color: "#e3bb85" }}>Radial</span>
						<span style={{ color: "#e8a28a" }}>Circular</span>
						<span>{es ? "Dorado: zónulas" : "Gold: zonules"}</span>
					</>
				) : (
					<span>
						{es
							? "Músculo liso · haces entrelazados"
							: "Smooth muscle · interwoven bundles"}
					</span>
				)}
			</div>
			<div className="lens-controls">
				<LensViews
					lang={lang}
					section={cutaway}
					onView={(view) => viewRef.current?.setView(view)}
				/>
				<label>
					<span className="lens-value">
						<span>{es ? "Acomodación del modelo" : "Model accommodation"}</span>
						<output>{accommodation.toFixed(1)} D</output>
					</span>
					<input
						type="range"
						min="0"
						max={MAX_ACCOMMODATION}
						step="0.1"
						value={accommodation}
						onChange={(e) => setAccommodation(Number(e.target.value))}
					/>
				</label>
				<div className="lens-buttons">
					<button
						type="button"
						aria-pressed={accommodation === 0}
						onClick={() => setAccommodation(0)}
					>
						{es ? "Lejos" : "Distance"}
					</button>
					<button
						type="button"
						aria-pressed={accommodation === 8}
						onClick={() => setAccommodation(8)}
					>
						{es ? "Cerca" : "Near"}
					</button>
					<button
						type="button"
						aria-pressed={cutaway}
						onClick={() => {
							setCutaway(!cutaway);
							viewRef.current?.setView(cutaway ? "reset" : "section");
						}}
					>
						{es ? "Sección abierta" : "Open section"}
					</button>
					<button
						type="button"
						aria-pressed={fibreMap}
						onClick={() => setFibreMap(!fibreMap)}
					>
						{es ? "Mapa muscular" : "Muscle map"}
					</button>
				</div>
				<p className="lens-note" aria-live="polite">
					{accommodation === 0
						? es
							? "Para lejos: mayor carga zonular de aplanamiento."
							: "Distance: greater zonular flattening load."
						: es
							? "Hacia cerca: el anillo se estrecha y disminuye la carga que aplana el cristalino. Indicación cualitativa, no medida de fuerza."
							: "Toward near: the ring narrows and the lens-flattening load decreases. A qualitative cue, not a force measurement."}
				</p>
				<p className="lens-note">
					{es
						? "Los pliegues marrones son procesos ciliares. El detalle fino sugiere haces de músculo liso a una escala ilustrativa. Activa el mapa muscular para localizar las regiones entrelazadas. El valor en D controla la animación; esta malla no calcula potencia óptica."
						: "Brown folds are ciliary processes. Fine markings suggest smooth-muscle bundles at an illustrative scale. Turn on the muscle map to locate the interwoven regions. The D value drives the animation; this mesh does not calculate optical power."}
				</p>
			</div>
		</div>
	);
}
