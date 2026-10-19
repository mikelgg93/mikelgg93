import "./lens.css";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import LensDivider from "./LensDivider";
import {
	createConstructionGrid,
	createRoundedLensGeometry,
	EQUATOR_RADIUS,
	LENS_THICKNESS,
} from "./lensConstruction";
import { clearLensMaterial } from "./lensMaterial";
import { createLensScene } from "./lensScene";

export default function LensSurface({ lang = "en" }: { lang?: "en" | "es" }) {
	const es = lang === "es";
	const mount = useRef<HTMLDivElement>(null);
	const viewRef = useRef<ReturnType<typeof createLensScene> | null>(null);
	const [reveal, setReveal] = useState(0.5);
	const split = useRef(reveal);
	const [error, setError] = useState(false);
	useEffect(() => {
		split.current = reveal;
		viewRef.current?.invalidate();
	}, [reveal]);
	useEffect(() => {
		if (!mount.current) return;
		let view: ReturnType<typeof createLensScene>;
		try {
			view = createLensScene(mount.current, 23, lang);
		} catch {
			setError(true);
			return;
		}
		viewRef.current = view;
		view.camera.position.set(21, 4, 7);
		const geometry = createRoundedLensGeometry();
		const material = clearLensMaterial();
		const opaque = new THREE.MeshPhongMaterial({
			color: 0x398b88,
			shininess: 25,
			side: THREE.DoubleSide,
		});
		const lens = new THREE.Mesh(geometry, material);
		const grid = createConstructionGrid(geometry.parameters.points);
		lens.add(grid);
		lens.scale.set(EQUATOR_RADIUS, EQUATOR_RADIUS, LENS_THICKNESS / 2);
		view.scene.add(lens);
		view.start(() => {
			lens.material = split.current === 1 ? opaque : material;
			grid.visible = split.current === 1;
			return {
				state: {
					construction:
						"One rounded mesh: construction grid versus transparent material",
					diameterMm: 2 * EQUATOR_RADIUS,
					thicknessMm: LENS_THICKNESS,
					meshReveal: split.current,
					optics: "Appearance shader only; no GRIN ray tracing",
				},
				afterRender: () => {
					if (split.current <= 0 || split.current >= 1) return;
					lens.material = opaque;
					grid.visible = true;
					view.renderer.setScissor(
						0,
						0,
						Math.round(view.renderer.domElement.clientWidth * split.current),
						view.renderer.domElement.clientHeight,
					);
					view.renderer.setScissorTest(true);
					try {
						view.renderer.render(view.scene, view.camera);
					} finally {
						view.renderer.setScissorTest(false);
					}
				},
			};
		});
		return () => {
			viewRef.current = null;
			const unused = lens.material === material ? opaque : material;
			view.dispose();
			unused.dispose();
		};
	}, [lang]);
	return (
		<div className="lens-demo">
			<div className="lens-heading">
				<strong>
					{es
						? "Del ecuador redondeado al material"
						: "From rounded equator to material"}
				</strong>
				<span className="lens-muted">
					{es ? "Arrastra para girar" : "Drag to orbit"}
				</span>
			</div>
			<div className="lens-animated-scene lens-surface-comparison">
				{error ? (
					<p role="status">
						{es ? "WebGL no está disponible." : "WebGL is unavailable."}
					</p>
				) : (
					<div
						ref={mount}
						className="lens-scene"
						role="img"
						aria-label={
							es
								? "La misma malla redondeada, con líneas de construcción y material transparente"
								: "The same rounded mesh, with construction lines and transparent material"
						}
					/>
				)}
				<div className="lens-comparison-labels">
					<span>{es ? "Malla" : "Mesh"}</span>
					<span>{es ? "Material" : "Material"}</span>
				</div>
				<LensDivider
					value={reveal}
					onChange={setReveal}
					label={es ? "Mostrar malla" : "Reveal mesh"}
				/>
			</div>
		</div>
	);
}
