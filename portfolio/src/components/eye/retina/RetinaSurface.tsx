import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createLensScene } from "../lens/lensScene";
import { createPosteriorEye } from "./posteriorEye";
import { innerRetinalRadius } from "./retinaAnatomy";
import { CUP_CENTRE_Z } from "./retinaModel";
import "../lens/lens.css";
import "./retina.css";

export default function RetinaSurface({ lang = "en" }: { lang?: "en" | "es" }) {
	const es = lang === "es",
		mount = useRef<HTMLDivElement>(null),
		caption = useRef<HTMLParagraphElement>(null);
	const [paused, setPaused] = useState(false),
		[error, setError] = useState(false);
	const params = useRef({ paused }),
		viewRef = useRef<ReturnType<typeof createLensScene> | null>(null);
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
		view.camera.position.set(8, 5, 38);
		view.controls.target.set(0, 0, -12);
		const eye = createPosteriorEye();
		view.scene.add(eye.group);
		const meshes: { mesh: THREE.Mesh; base: Float32Array }[] = [];
		eye.group.getObjectByName("retina")?.traverse((object) => {
			if (object instanceof THREE.Mesh) {
				meshes.push({
					mesh: object,
					base: new Float32Array(object.geometry.attributes.position.array),
				});
			}
		});
		const v = new THREE.Vector3(),
			direction = new THREE.Vector3();
		let elapsed = 0,
			previous = -1;
		view.onReset(() => {
			elapsed = 0;
			previous = -1;
			setPaused(false);
		});
		view.start((dt, reduced) => {
			if (!params.current.paused && !reduced) elapsed += dt;
			const t = reduced ? 15 : elapsed % 20,
				pit = Math.min(1, Math.max(0, (t - 4) / 4));
			eye.update(
				false,
				{ choroid: false, sclera: false, nerve: t >= 12 },
				t >= 9,
			);
			if (pit !== previous) {
				for (const { mesh, base } of meshes) {
					const position = mesh.geometry.attributes.position;
					for (let i = 0; i < position.count; i++) {
						v.set(base[i * 3], base[i * 3 + 1], base[i * 3 + 2] - CUP_CENTRE_Z);
						const r = v.length(),
							inner = innerRetinalRadius(direction.copy(v).normalize());
						const weight = THREE.MathUtils.clamp(
							(12.3 - r) / (12.3 - inner),
							0,
							1,
						);
						v.multiplyScalar((r - (1 - pit) * (inner - 12) * weight) / r);
						position.setXYZ(i, v.x, v.y, v.z + CUP_CENTRE_Z);
					}
					position.needsUpdate = true;
					mesh.geometry.computeVertexNormals();
					mesh.geometry.computeBoundingSphere();
				}
				previous = pit;
			}
			for (const { mesh } of meshes) {
				const material = mesh.material as THREE.MeshPhongMaterial;
				material.wireframe = t < 2;
			}
			const stage = t < 2 ? 0 : t < 4 ? 1 : t < 9 ? 2 : t < 12 ? 3 : 4;
			if (caption.current)
				caption.current.textContent = (
					es
						? [
								"Malla",
								"Material y pigmentación ilustrativa",
								"Relieve foveal",
								"Vasos principales",
								"Salida del nervio óptico",
							]
						: [
								"Mesh",
								"Material and illustrative pigmentation",
								"Foveal relief",
								"Major vessels",
								"Optic nerve exit",
							]
				)[stage]!;
			return {
				state: {
					model: "Surface construction; stylised pigmentation and vessels",
					stage,
					pit,
				},
				animating: !reduced && !params.current.paused,
			};
		});
		return () => {
			viewRef.current = null;
			view.dispose();
		};
	}, [lang]);
	return (
		<div className="lens-demo retina-demo">
			<div className="lens-heading">
				<strong>
					{es ? "Dar forma a la superficie" : "Give the surface its landmarks"}
				</strong>
			</div>
			<div
				className="lens-scene"
				ref={mount}
				role="img"
				aria-label={
					es
						? "Construcción de la superficie retiniana"
						: "Retinal surface construction"
				}
			>
				{error && <p role="status">WebGL unavailable.</p>}
				<p className="retina-camera" ref={caption} />
			</div>
			<div className="lens-controls">
				<button
					type="button"
					className="lens-motion-pause"
					aria-pressed={paused}
					onClick={() => setPaused(!paused)}
				>
					{paused ? (es ? "Continuar" : "Resume") : es ? "Pausar" : "Pause"}
				</button>
				<p className="lens-note">
					{es
						? "Construcción animada, no crecimiento del tejido. El relieve es geométrico; el color es ilustrativo."
						: "Animated construction, not tissue growth. The pit is geometry; colour is illustrative."}
				</p>
			</div>
		</div>
	);
}
