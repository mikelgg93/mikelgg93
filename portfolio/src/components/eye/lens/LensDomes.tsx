import "./lens.css";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import LensViews from "./LensViews";
import { capHeight, DOME_APERTURE } from "./lensOptics";
import { createLensScene } from "./lensScene";

export default function LensDomes({ lang = "en" }: { lang?: "en" | "es" }) {
	const es = lang === "es";
	const mount = useRef<HTMLDivElement>(null);
	const viewRef = useRef<ReturnType<typeof createLensScene> | null>(null);
	const [radius, setRadius] = useState(6.5);
	const [separated, setSeparated] = useState(true);
	const [wireframe, setWireframe] = useState(true);
	const [error, setError] = useState(false);
	const params = useRef({ radius, separated, wireframe });
	useEffect(() => {
		params.current = { radius, separated, wireframe };
		viewRef.current?.invalidate();
	}, [radius, separated, wireframe]);
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
		view.camera.position.set(17, 4, 14);
		// One cap, duplicated and reversed. The same vertex buffer supplies both
		// surfaces, just as a cornea-like spherical cap supplies the first lesson.
		const geometry = new THREE.PlaneGeometry(1, 1, 48, 64);
		const uv = geometry.getAttribute("uv");
		const positions = geometry.getAttribute("position");
		const front = new THREE.Mesh(
			geometry,
			new THREE.MeshPhongMaterial({
				color: 0x72dedd,
				transparent: true,
				opacity: 0.45,
				side: THREE.DoubleSide,
				depthWrite: false,
				shininess: 90,
			}),
		);
		const back = new THREE.Mesh(
			geometry,
			new THREE.MeshPhongMaterial({
				color: 0xa1b2e4,
				transparent: true,
				opacity: 0.45,
				side: THREE.DoubleSide,
				depthWrite: false,
				shininess: 90,
			}),
		);
		back.rotation.y = Math.PI;
		const wireMaterial = new THREE.LineBasicMaterial({
			color: 0xc4f9f4,
			transparent: true,
			opacity: 0.4,
			depthWrite: false,
		});
		// A sparse construction grid stays legible on phones; the surface is smooth.
		const grid = new THREE.BufferGeometry();
		const gridPositions = new THREE.Float32BufferAttribute(
			new Float32Array(768 * 2 * 3),
			3,
		);
		grid.setAttribute("position", gridPositions);
		const frontWire = new THREE.LineSegments(grid, wireMaterial);
		const backWire = new THREE.LineSegments(grid, wireMaterial);
		front.add(frontWire);
		back.add(backWire);
		view.scene.add(front, back);
		let lastRadius = -1;
		view.start(() => {
			const p = params.current;
			if (p.radius !== lastRadius) {
				for (let i = 0; i < positions.count; i++) {
					const r = uv.getX(i) * DOME_APERTURE;
					const angle = uv.getY(i) * Math.PI * 2;
					positions.setXYZ(
						i,
						r * Math.cos(angle),
						r * Math.sin(angle),
						capHeight(p.radius, r),
					);
				}
				positions.needsUpdate = true;
				geometry.computeVertexNormals();
				geometry.computeBoundingSphere();
				let vertex = 0;
				const point = (r: number, angle: number) => {
					gridPositions.setXYZ(
						vertex++,
						r * Math.cos(angle),
						r * Math.sin(angle),
						capHeight(p.radius, r) + 0.005,
					);
				};
				for (let ring = 1; ring <= 6; ring++) {
					const r = (ring / 6) * DOME_APERTURE;
					for (let j = 0; j < 64; j++) {
						point(r, (j / 64) * Math.PI * 2);
						point(r, ((j + 1) / 64) * Math.PI * 2);
					}
				}
				for (let meridian = 0; meridian < 16; meridian++) {
					const angle = (meridian / 16) * Math.PI * 2;
					for (let j = 0; j < 24; j++) {
						point((j / 24) * DOME_APERTURE, angle);
						point(((j + 1) / 24) * DOME_APERTURE, angle);
					}
				}
				gridPositions.needsUpdate = true;
				grid.computeBoundingSphere();
				lastRadius = p.radius;
			}
			front.position.z = p.separated ? 1.25 : 0;
			back.position.z = p.separated ? -1.25 : 0;
			frontWire.visible = backWire.visible = p.wireframe;
			return {
				state: {
					model:
						"Two identical opposing spherical caps, not anatomical lens surfaces",
					radius: p.radius,
					aperture: DOME_APERTURE,
					thickness: 2 * capHeight(p.radius, 0),
					separated: p.separated,
				},
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
						? "Una cúpula, duplicada e invertida"
						: "One dome, duplicated and reversed"}
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
							? "Dos casquetes esféricos opuestos"
							: "Two opposing spherical caps"
					}
				/>
			)}
			<div className="lens-legend">
				<span>{es ? "Cian: superficie anterior" : "Cyan: front surface"}</span>
				<span>{es ? "Violeta: copia invertida" : "Violet: reversed copy"}</span>
			</div>
			<div className="lens-controls">
				<LensViews
					lang={lang}
					onView={(view) => viewRef.current?.setView(view)}
				/>
				<label>
					<span className="lens-value">
						<span>
							{es ? "Radio de ambas superficies" : "Radius of both surfaces"}
						</span>
						<output>{radius.toFixed(1)} mm</output>
					</span>
					<input
						type="range"
						min="6"
						max="14"
						step="0.1"
						value={radius}
						onChange={(e) => setRadius(Number(e.target.value))}
					/>
				</label>
				<div className="lens-buttons">
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
					<button
						type="button"
						aria-pressed={wireframe}
						onClick={() => setWireframe(!wireframe)}
					>
						{es ? "Malla" : "Wireframe"}
					</button>
				</div>
				<p className="lens-note">
					{es
						? "Primera aproximación: dos superficies iguales, sin gradiente interno ni músculos. El espacio entre ellas es una vista de despiece."
						: "First approximation: matching surfaces, without an internal gradient or muscles. The gap is an exploded view."}
				</p>
			</div>
		</div>
	);
}
