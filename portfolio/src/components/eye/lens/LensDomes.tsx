import "./lens.css";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useInitialParameters } from "../ParameterControl";
import {
	BACK_RADIUS,
	createTeachingCap,
	EQUATOR_RADIUS,
	FRONT_RADIUS,
} from "./lensConstruction";
import { createLensScene } from "./lensScene";

export default function LensDomes({ lang = "en" }: { lang?: "en" | "es" }) {
	const es = lang === "es";
	const mount = useRef<HTMLDivElement>(null);
	const viewRef = useRef<ReturnType<typeof createLensScene> | null>(null);
	const [separated, setSeparated] = useState(true);
	const [error, setError] = useState(false);
	const params = useRef({ separated });
	useEffect(() => {
		params.current = { separated };
		viewRef.current?.invalidate();
	}, [separated]);
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
		const surfaces = [FRONT_RADIUS, BACK_RADIUS].map((radius, i) => {
			const geometry = createTeachingCap(radius);
			const mesh = new THREE.Mesh(
				geometry,
				new THREE.MeshPhongMaterial({
					color: i ? 0xa1b2e4 : 0x72dedd,
					side: THREE.DoubleSide,
					transparent: true,
					opacity: 0.65,
					shininess: 30,
				}),
			);
			if (i) mesh.rotation.y = Math.PI;
			view.scene.add(mesh);
			return mesh;
		});
		view.start((dt, reducedMotion) => {
			const target = params.current.separated ? 1.25 : 0;
			let gap = surfaces[0].position.z;
			gap += (target - gap) * (reducedMotion ? 1 : 1 - Math.exp(-dt / 0.2));
			if (Math.abs(target - gap) < 0.001) gap = target;
			surfaces[0].position.z = gap;
			surfaces[1].position.z = -gap;
			return {
				state: {
					model: "Opposing spherical caps; sharp equator",
					frontRadiusMm: FRONT_RADIUS,
					backRadiusMm: BACK_RADIUS,
					diameterMm: 2 * EQUATOR_RADIUS,
					separated: params.current.separated,
				},
				animating: gap !== target,
			};
		});
		return () => {
			viewRef.current = null;
			view.dispose();
		};
	}, [lang]);
	useInitialParameters(
		{ separated },
		(initial) => setSeparated(initial.separated),
		mount,
	);
	return (
		<div className="lens-demo">
			<div className="lens-heading">
				<strong>{es ? "Dos cúpulas opuestas" : "Two opposing domes"}</strong>
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
						es
							? "Dos casquetes esféricos, anterior más plano y posterior más curvo"
							: "Two spherical caps, flatter anterior and steeper posterior"
					}
				/>
			)}
			<div className="lens-legend">
				<span>
					{es ? "Cian: anterior · R 10,2 mm" : "Cyan: anterior · R 10.2 mm"}
				</span>
				<span>
					{es ? "Violeta: posterior · R 6 mm" : "Violet: posterior · R 6 mm"}
				</span>
			</div>
			<div className="lens-controls">
				<button
					type="button"
					aria-pressed={!separated}
					onClick={() => setSeparated(!separated)}
				>
					{separated
						? es
							? "Unir las cúpulas"
							: "Join the domes"
						: es
							? "Separar las cúpulas"
							: "Separate the domes"}
				</button>
			</div>
		</div>
	);
}
