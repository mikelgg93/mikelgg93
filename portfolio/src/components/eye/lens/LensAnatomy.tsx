import "./lens.css";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
	ciliaryPoint,
	deformCiliary,
	MUSCLE_REGIONS,
	muscleGeometry,
} from "./ciliaryGeometry";
import LensViews from "./LensViews";
import { lensShape, MAX_ACCOMMODATION } from "./lensModel";
import { createLensGeometry, createLensScene } from "./lensScene";

export default function LensAnatomy({ lang = "en" }: { lang?: "en" | "es" }) {
	const es = lang === "es";
	const mount = useRef<HTMLDivElement>(null);
	const viewRef = useRef<ReturnType<typeof createLensScene> | null>(null);
	const [accommodation, setAccommodation] = useState(0);
	const [cutaway, setCutaway] = useState(false);
	const [fibreMap, setFibreMap] = useState(true);
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
		const lens = new THREE.Group();
		const shapeGeometry = createLensGeometry();
		const shellMaterial = new THREE.MeshPhongMaterial({
			color: 0x77dfe0,
			specular: 0xffffff,
			shininess: 90,
			transparent: true,
			opacity: 0.28,
			depthWrite: false,
			side: THREE.DoubleSide,
		});
		lens.add(new THREE.Mesh(shapeGeometry, shellMaterial));
		const coreMaterial = new THREE.MeshPhongMaterial({
			color: 0xa9daca,
			transparent: true,
			opacity: 0.22,
			depthWrite: false,
		});
		const core = new THREE.Mesh(shapeGeometry, coreMaterial);
		core.scale.set(0.7, 0.7, 0.66);
		lens.add(core);
		view.scene.add(lens);
		const outline = new THREE.LineBasicMaterial({
			color: 0x9cffff,
			transparent: true,
			opacity: 0.45,
		});
		for (let meridian = 0; meridian < 4; meridian++) {
			const angle = (meridian / 4) * Math.PI;
			const points = Array.from({ length: 97 }, (_, i) => {
				const t = (i / 96) * Math.PI * 2,
					z = Math.sin(t);
				return new THREE.Vector3(
					Math.cos(t) * Math.cos(angle),
					Math.cos(t) * Math.sin(angle),
					z * (z > 0 ? 0.85 : 1.15),
				);
			});
			lens.add(
				new THREE.Line(
					new THREE.BufferGeometry().setFromPoints(points),
					outline,
				),
			);
		}
		const muscles = MUSCLE_REGIONS.map((region) => {
			const geometry = muscleGeometry(region.profile);
			const material = new THREE.MeshPhongMaterial({
				color: region.color,
				side: THREE.DoubleSide,
				shininess: 22,
			});
			view.scene.add(new THREE.Mesh(geometry, material));
			return {
				geometry,
				material,
				rest: new Float32Array(geometry.getAttribute("position").array),
				color: new THREE.Color(region.color),
			};
		});
		// Surface tracks show the orientations of interwoven muscle bundles.
		const fibreMaterial = new THREE.LineBasicMaterial({
			color: 0xffd7bf,
			transparent: true,
			opacity: 0.65,
		});
		const tracks: { geometry: THREE.BufferGeometry; rest: Float32Array }[] = [];
		for (let i = 0; i < 40; i++) {
			const angle = (i / 40) * Math.PI * 2;
			for (const type of [0, 1, 2]) {
				const points = Array.from({ length: 17 }, (_, j) => {
					const t = j / 16;
					if (type === 0) return ciliaryPoint(7.12, angle, -2.65 + 3.7 * t, 0);
					if (type === 1)
						return ciliaryPoint(
							6.65 - 0.63 * t,
							angle + 0.05 * t,
							1.13 - 0.18 * t,
							0,
						);
					return ciliaryPoint(5.82, angle + 0.14 * t, 0.65, 0);
				});
				const geometry = new THREE.BufferGeometry().setFromPoints(points);
				view.scene.add(new THREE.Line(geometry, fibreMaterial));
				tracks.push({
					geometry,
					rest: new Float32Array(geometry.getAttribute("position").array),
				});
			}
		}
		// Processes are epithelial/vascular folds, not extra muscle spokes.
		const foldGeometry = new THREE.SphereGeometry(1, 16, 12);
		const foldMaterial = new THREE.MeshPhongMaterial({
			color: 0x8b5843,
			shininess: 18,
		});
		const folds = Array.from({ length: 40 }, (_, i) => {
			const mesh = new THREE.Mesh(foldGeometry, foldMaterial);
			const angle = (i / 40) * Math.PI * 2;
			mesh.scale.set(0.55, 0.115, 0.34);
			mesh.rotation.z = angle;
			view.scene.add(mesh);
			return { mesh, angle };
		});
		const zonuleMaterial = new THREE.LineBasicMaterial({
			color: 0xf9d889,
			transparent: true,
			opacity: 0.75,
		});
		const zonules = Array.from({ length: 120 }, () => {
			const geometry = new THREE.BufferGeometry();
			geometry.setAttribute(
				"position",
				new THREE.BufferAttribute(new Float32Array(25 * 3), 3),
			);
			view.scene.add(new THREE.Line(geometry, zonuleMaterial));
			return geometry;
		});
		const allMaterials = [
			shellMaterial,
			coreMaterial,
			outline,
			...muscles.map((m) => m.material),
			fibreMaterial,
			foldMaterial,
			zonuleMaterial,
		];
		// Outline the cut profiles so a clipped surface reads as a section.
		const section = new THREE.Group();
		const sectionMaterial = new THREE.LineBasicMaterial({ color: 0xffebce });
		const sectionTracks = MUSCLE_REGIONS.flatMap((region) =>
			[0, Math.PI].map((angle) => {
				const geometry = new THREE.BufferGeometry().setFromPoints(
					region.profile.map(([r, z]) => {
						const point = ciliaryPoint(r, angle, z, 0);
						point.y = -0.004;
						return point;
					}),
				);
				section.add(new THREE.Line(geometry, sectionMaterial));
				return {
					geometry,
					rest: new Float32Array(geometry.getAttribute("position").array),
				};
			}),
		);
		view.scene.add(section);
		const clipping = [new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)];
		const neutralMuscle = new THREE.Color(0xa16c65);
		let shown = params.current.accommodation,
			previous = -1,
			lastCutaway = false;
		view.start((dt, reducedMotion) => {
			const p = params.current;
			// Animation timing only; this is not a tissue mechanics solver.
			shown +=
				(p.accommodation - shown) *
				(reducedMotion ? 1 : 1 - Math.exp(-dt / 0.25));
			if (Math.abs(p.accommodation - shown) < 1e-4) shown = p.accommodation;
			const shape = lensShape(shown);
			if (Math.abs(shown - previous) > 1e-5) {
				lens.scale.set(shape.lensRadius, shape.lensRadius, shape.thickness / 2);
				for (const body of [...muscles, ...tracks, ...sectionTracks])
					deformCiliary(body.geometry, body.rest, shape.fraction);
				for (const fold of folds)
					fold.mesh.position.copy(
						ciliaryPoint(5.85, fold.angle, 0.05, shape.fraction),
					);
				zonules.forEach((geometry, i) => {
					// Representative fibres course between processes from a posterior
					// origin, then fan toward three capsular attachment regions.
					const angle = (((i % 40) + 0.5) / 40) * Math.PI * 2;
					const side = Math.floor(i / 40) - 1;
					const attachment = side === 0 ? 1 : 0.96;
					const z =
						((side * shape.thickness) / 2) *
						(side > 0 ? 0.85 : 1.15) *
						Math.sqrt(1 - attachment ** 2);
					const end = new THREE.Vector3(
						shape.lensRadius * attachment * Math.cos(angle),
						shape.lensRadius * attachment * Math.sin(angle),
						z,
					);
					const origin = ciliaryPoint(6.58, angle, -1.95, shape.fraction);
					const guide = ciliaryPoint(5.72, angle, -0.32, shape.fraction);
					const attribute = geometry.getAttribute("position");
					const point = new THREE.Vector3();
					for (let j = 0; j <= 24; j++) {
						const t = j / 24;
						if (t < 0.5) point.lerpVectors(origin, guide, t * 2);
						else point.lerpVectors(guide, end, (t - 0.5) * 2);
						attribute.setXYZ(j, point.x, point.y, point.z);
					}
					attribute.needsUpdate = true;
					geometry.computeBoundingSphere();
				});
				previous = shown;
			}
			for (const muscle of muscles)
				muscle.material.color.copy(p.fibreMap ? muscle.color : neutralMuscle);
			fibreMaterial.opacity = p.fibreMap ? 0.65 : 0;
			section.visible = p.cutaway;
			if (p.cutaway !== lastCutaway) {
				for (const material of allMaterials) {
					material.clippingPlanes = p.cutaway ? clipping : [];
					material.needsUpdate = true;
				}
				lastCutaway = p.cutaway;
			}
			return {
				state: {
					model:
						"Ciliary muscle regions, representative processes and zonular attachments; illustrative geometry",
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
				<span style={{ color: "#d4a1bb" }}>Longitudinal</span>
				<span style={{ color: "#e3bb85" }}>Radial</span>
				<span style={{ color: "#e8a28a" }}>Circular</span>
				<span>{es ? "Dorado: zónulas" : "Gold: zonules"}</span>
				<span>{es ? "Cian: guías de superficie" : "Cyan: surface guides"}</span>
			</div>
			<div className="lens-controls">
				<LensViews
					lang={lang}
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
						onClick={() => setCutaway(!cutaway)}
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
						? "Los pliegues marrones son procesos ciliares. Las regiones musculares están resaltadas para mostrar su orientación; forman un músculo continuo, no tres motores separados."
						: "Brown folds are ciliary processes. Muscle regions are highlighted to show orientation; they form a continuous muscle, not three separate motors."}
				</p>
			</div>
		</div>
	);
}
