import ParameterControl, { useInitialParameters } from "../ParameterControl";
import { parameterContext } from "../parameterContext";
import "../lens/lens.css";
import "./retina.css";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createLensScene } from "../lens/lensScene";
import {
	createRetinalCup,
	retinalMaterial,
	updateRetinalCup,
} from "./retinaGeometry";

export default function RetinaCup({ lang = "en" }: { lang?: "en" | "es" }) {
	const es = lang === "es",
		mount = useRef<HTMLDivElement>(null);
	const viewRef = useRef<ReturnType<typeof createLensScene> | null>(null);
	const [curvature, setCurvature] = useState(0),
		[wire, setWire] = useState(true),
		[error, setError] = useState(false);
	const params = useRef({ curvature, wire });
	useEffect(() => {
		params.current = { curvature, wire };
		viewRef.current?.invalidate();
	}, [curvature, wire]);
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
		view.camera.position.set(27, 20, 43);
		view.controls.target.set(0, 0, 6);
		const geometry = createRetinalCup();
		const cup = new THREE.Mesh(geometry, retinalMaterial());
		cup.position.z = 18.4;
		const wireframe = new THREE.Mesh(
			geometry,
			new THREE.MeshBasicMaterial({
				color: 0xf1c6aa,
				wireframe: true,
				transparent: true,
				opacity: 0.18,
			}),
		);
		cup.add(wireframe);
		view.scene.add(cup);
		let shown = params.current.curvature,
			previous = -1;
		view.start((dt, reduced) => {
			const p = params.current;
			shown += (p.curvature - shown) * (reduced ? 1 : 1 - Math.exp(-dt / 0.18));
			if (Math.abs(shown - p.curvature) < 1e-5) shown = p.curvature;
			if (shown !== previous) {
				updateRetinalCup(geometry, shown);
				previous = shown;
			}
			wireframe.visible = p.wire;
			return {
				state: {
					model: "Posterior spherical cup, R=12 mm drawing choice",
					curvature: shown,
				},
				animating: shown !== p.curvature,
			};
		});
		return () => {
			viewRef.current = null;
			view.dispose();
		};
	}, [lang]);
	const resetAnchor = useRef<HTMLDivElement>(null);
	const defaults = useInitialParameters(
		{ curvature, wire },
		(initial) => {
			setCurvature(initial.curvature);
			setWire(initial.wire);
		},
		resetAnchor,
	);
	return (
		<div ref={resetAnchor} className="lens-demo retina-demo">
			<div className="lens-heading">
				<strong>
					{es ? "De una malla plana a una copa" : "From a flat mesh to a cup"}
				</strong>
				<span className="lens-muted">
					{es ? "Construcción geométrica" : "Geometry construction"}
				</span>
			</div>
			<div
				className="lens-scene"
				ref={mount}
				role="img"
				aria-label={
					es
						? "Malla de la superficie retiniana posterior"
						: "Mesh of the posterior retinal surface"
				}
			>
				{error && (
					<p role="status">
						{es ? "WebGL no está disponible." : "WebGL is unavailable."}
					</p>
				)}
				<p className="retina-camera">
					{es
						? "Arrastra para girar · colores ilustrativos"
						: "Drag to orbit · illustrative colours"}
				</p>
			</div>
			<div className="lens-controls">
				<ParameterControl
					hideReset
					value={curvature}
					initial={defaults.curvature}
					onReset={setCurvature}
					label="surface curvature"
					lang={lang}
					context={parameterContext.retinaCup}
				>
					<label>
						<span className="lens-value">
							{es ? "Curvar la malla" : "Bend the mesh"}
							<output>{Math.round(curvature * 100)}%</output>
						</span>
						<input
							aria-label={es ? "Curvar la malla" : "Bend the mesh"}
							type="range"
							min="0"
							max="1"
							step="0.01"
							value={curvature}
							onChange={(e) => setCurvature(Number(e.target.value))}
						/>
					</label>
				</ParameterControl>
				<div className="lens-buttons">
					<ParameterControl
						hideReset
						value={wire}
						initial={defaults.wire}
						onReset={setWire}
						label="wireframe"
						lang={lang}
					>
						<button
							type="button"
							aria-pressed={wire}
							onClick={() => setWire(!wire)}
						>
							{es ? "Triángulos" : "Triangles"}
						</button>
					</ParameterControl>
				</div>
				<p className="lens-note">
					{es
						? "Radio elegido: 12 mm. La transición plana → curva es un paso de construcción, no una deformación fisiológica."
						: "Chosen radius: 12 mm. Flat → curved is a construction step, not a physiological deformation."}
				</p>
			</div>
		</div>
	);
}
