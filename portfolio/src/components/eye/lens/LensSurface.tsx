import "./lens.css";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
	createRoundedLensGeometry,
	EQUATOR_RADIUS,
	LENS_THICKNESS,
} from "./lensConstruction";
import { clearLensMaterial } from "./lensMaterial";
import { createLensScene } from "./lensScene";

export default function LensSurface({
	lang = "en",
	material = false,
}: {
	lang?: "en" | "es";
	material?: boolean;
}) {
	const es = lang === "es";
	const mount = useRef<HTMLDivElement>(null);
	const [error, setError] = useState(false);
	useEffect(() => {
		if (!mount.current) return;
		let view: ReturnType<typeof createLensScene>;
		try {
			view = createLensScene(mount.current, 23, lang);
		} catch {
			setError(true);
			return;
		}
		view.camera.position.set(21, 4, 7);
		const geometry = createRoundedLensGeometry();
		const lens = new THREE.Mesh(
			geometry,
			material
				? clearLensMaterial()
				: new THREE.MeshPhongMaterial({
						color: 0x72dedd,
						shininess: 35,
						side: THREE.DoubleSide,
					}),
		);
		lens.scale.set(EQUATOR_RADIUS, EQUATOR_RADIUS, LENS_THICKNESS / 2);
		view.scene.add(lens);
		view.start(() => ({
			state: {
				construction:
					"Central spherical patches with tangent-matched Bézier equator",
				diameterMm: 2 * EQUATOR_RADIUS,
				thicknessMm: LENS_THICKNESS,
				material: material
					? "Approximate transmission shader, not GRIN ray tracing"
					: "Opaque shape study",
			},
		}));
		return () => view.dispose();
	}, [lang, material]);
	return (
		<div className="lens-demo">
			<div className="lens-heading">
				<strong>
					{material
						? es
							? "La misma malla, con material transparente"
							: "The same mesh, with transparent material"
						: es
							? "Un ecuador redondeado"
							: "A rounded equator"}
				</strong>
				<span className="lens-muted">
					{es ? "Arrastra para girar" : "Drag to orbit"}
				</span>
			</div>
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
						material
							? es
								? "Cristalino transparente con borde redondeado"
								: "Transparent lens with a rounded edge"
							: es
								? "Malla opaca que muestra la unión curva del ecuador"
								: "Opaque mesh showing the curved equatorial join"
					}
				/>
			)}
		</div>
	);
}
