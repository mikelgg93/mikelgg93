import ParameterControl, { useInitialParameters } from "../ParameterControl";
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
	const [wire, setWire] = useState(true),
		[error, setError] = useState(false);
	const params = useRef({ wire });
	useEffect(() => {
		params.current = { wire };
		viewRef.current?.invalidate();
	}, [wire]);
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
		updateRetinalCup(geometry, 1);
		view.start(() => {
			const p = params.current;
			wireframe.visible = p.wire;
			return {
				state: {
					model: "Posterior spherical cup, R=10.8 mm drawing choice",
					curvature: 1,
				},
			};
		});
		return () => {
			viewRef.current = null;
			view.dispose();
		};
	}, [lang]);
	const resetAnchor = useRef<HTMLDivElement>(null);
	const defaults = useInitialParameters(
		{ wire },
		(initial) => {
			setWire(initial.wire);
		},
		resetAnchor,
	);
	return (
		<div ref={resetAnchor} className="lens-demo retina-demo">
			<div className="lens-heading">
				<strong>{es ? "Una cúpula posterior" : "A posterior dome"}</strong>
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
						? "Radio elegido: 10.8 mm. La cúpula ya está formada; los triángulos muestran su construcción."
						: "Chosen radius: 10.8 mm. The dome is already formed; triangles show its construction."}
				</p>
			</div>
		</div>
	);
}
