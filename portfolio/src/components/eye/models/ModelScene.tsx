import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import LensViews from "../lens/LensViews";
import { createLensScene } from "../lens/lensScene";
import ParameterControl, { useInitialParameters } from "../ParameterControl";
import type { EyePrescription } from "./eyeModels";
import { createPatch, PATCHES, updatePatch } from "./modelGeometry";

export default function ModelScene({
	eye,
	lang = "en",
	diagnostics,
}: {
	eye: EyePrescription;
	lang?: "en" | "es";
	diagnostics?: object;
}) {
	const mount = useRef<HTMLDivElement>(null),
		viewRef = useRef<ReturnType<typeof createLensScene> | null>(null);
	const [section, setSection] = useState(true),
		[error, setError] = useState(false);
	const params = useRef({ eye, section, diagnostics });
	useEffect(() => {
		params.current = { eye, section, diagnostics };
		viewRef.current?.invalidate();
	}, [eye, section, diagnostics]);
	useEffect(() => {
		if (!mount.current) return;
		let view: ReturnType<typeof createLensScene>;
		try {
			view = createLensScene(mount.current, 58, lang);
		} catch {
			setError(true);
			return;
		}
		viewRef.current = view;
		view.camera.position.set(48, 16, 12);
		const group = new THREE.Group();
		group.position.z = 12;
		view.scene.add(group);
		const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
		const meshes = PATCHES.map((patch) => {
			const colour =
				patch === "retina"
					? 0xd18d6b
					: patch.includes("Cornea")
						? 0x73c4dc
						: 0xe9ca79;
			const material = new THREE.MeshStandardMaterial({
				color: colour,
				roughness: 0.38,
				metalness: 0.08,
				side: THREE.DoubleSide,
			});
			const mesh = new THREE.Mesh(createPatch(), material);
			group.add(mesh);
			return mesh;
		});
		const axis = new THREE.Line(
			new THREE.BufferGeometry().setFromPoints([
				new THREE.Vector3(0, 0, 1),
				new THREE.Vector3(0, 0, -32),
			]),
			new THREE.LineDashedMaterial({
				color: 0xa2bab7,
				dashSize: 0.6,
				gapSize: 0.4,
			}),
		);
		axis.computeLineDistances();
		group.add(axis);
		let previous: EyePrescription | undefined,
			previousSection: boolean | undefined;
		view.start(() => {
			const p = params.current;
			if (p.eye !== previous) {
				meshes.forEach((mesh, i) => {
					updatePatch(mesh.geometry, p.eye, PATCHES[i]!);
				});
				previous = p.eye;
			}
			if (p.section !== previousSection) {
				for (const mesh of meshes) {
					mesh.material.clippingPlanes = p.section ? [clip] : [];
					mesh.material.needsUpdate = true;
				}
				previousSection = p.section;
			}
			return {
				state: {
					...p.diagnostics,
					model: p.eye.id,
					cct: p.eye.cct,
					internalACD: p.eye.acd,
					lt: p.eye.lt,
					axialEndpoint: p.eye.axial,
					section: p.section,
				},
			};
		});
		return () => {
			viewRef.current = null;
			view.dispose();
		};
	}, [lang]);
	const es = lang === "es";
	const defaults = useInitialParameters(
		{ section },
		(initial) => {
			setSection(initial.section);
		},
		mount,
	);
	return (
		<>
			<div
				className="lens-scene"
				ref={mount}
				role="img"
				aria-label={
					es
						? "Superficies oculares a escala, colores identificativos"
						: "Ocular surfaces to scale, colours identify structures"
				}
			>
				{error && (
					<p role="status">
						{es
							? "WebGL no está disponible; las dimensiones aparecen debajo."
							: "WebGL is unavailable; dimensions are listed below."}
					</p>
				)}
				<span className="models-camera">
					{es
						? "Arrastra o usa las flechas · misma escala"
						: "Drag or use arrow keys · same scale"}
				</span>
			</div>
			<div className="lens-legend">
				<span style={{ color: "#73c4dc" }}>{es ? "Córnea" : "Cornea"}</span>
				<span style={{ color: "#e9ca79" }}>{es ? "Cristalino" : "Lens"}</span>
				<span style={{ color: "#d18d6b" }}>
					{es ? "Superficie posterior" : "Posterior surface"}
				</span>
			</div>
			<div className="lens-controls">
				<div className="lens-buttons">
					<ParameterControl
						value={section}
						initial={defaults.section}
						onReset={setSection}
						label="section view"
						lang={lang}
					>
						<button
							type="button"
							aria-pressed={section}
							onClick={() => setSection(!section)}
						>
							{es ? "Sección" : "Section"}
						</button>
					</ParameterControl>
				</div>
				<LensViews
					lang={lang}
					section={section}
					onView={(name) => {
						const view = viewRef.current;
						if (!view) return;
						view.setView(name);
						if (name === "reset") view.camera.position.set(48, 16, 12);
						view.controls.update();
						view.invalidate();
					}}
				/>
			</div>
		</>
	);
}
