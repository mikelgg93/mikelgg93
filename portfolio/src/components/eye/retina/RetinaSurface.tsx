import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createLensScene } from "../lens/lensScene";
import { createPosteriorEye } from "./posteriorEye";
import { innerRetinalRadius, RETINAL_WALL } from "./retinaAnatomy";
import { CUP_CENTRE_Z, CUP_RADIUS } from "./retinaModel";
import "../lens/lens.css";
import "./retina.css";

export default function RetinaSurface({ lang = "en" }: { lang?: "en" | "es" }) {
	const es = lang === "es",
		mount = useRef<HTMLDivElement>(null),
		caption = useRef<HTMLParagraphElement>(null),
		profile = useRef<HTMLDivElement>(null);
	const [paused, setPaused] = useState(false),
		[error, setError] = useState(false),
		[finished, setFinished] = useState(false);
	const replay = useRef<(() => void) | null>(null);
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
		const eye = createPosteriorEye({ lesson: true });
		view.scene.add(eye.group);
		const mesh = eye.group.getObjectByName("retina")!.children[0] as THREE.Mesh<
			THREE.BufferGeometry,
			THREE.MeshStandardMaterial
		>;
		const geometry = mesh.geometry,
			full = geometry.getAttribute("position").clone(),
			fullNormals = geometry.getAttribute("normal").clone(),
			position = geometry.getAttribute("position");
		const v = new THREE.Vector3(),
			direction = new THREE.Vector3();
		// Precompute endpoints once. Three.js interpolates positions/normals on the GPU.
		for (let i = 0; i < position.count; i++) {
			v.fromBufferAttribute(full, i);
			v.z -= CUP_CENTRE_Z;
			const r = v.length(),
				inner = innerRetinalRadius(direction.copy(v).normalize());
			const weight = THREE.MathUtils.clamp(
				(CUP_RADIUS + RETINAL_WALL - r) / (CUP_RADIUS + RETINAL_WALL - inner),
				0,
				1,
			);
			v.multiplyScalar((r - (inner - CUP_RADIUS) * weight) / r);
			position.setXYZ(i, v.x, v.y, v.z + CUP_CENTRE_Z);
		}
		geometry.computeVertexNormals();
		geometry.morphAttributes.position = [full];
		geometry.morphAttributes.normal = [fullNormals];
		mesh.updateMorphTargets();
		geometry.computeBoundingSphere();
		let autoCamera = true;
		const manual = () => {
			autoCamera = false;
		};
		view.onInteraction(manual);

		let elapsed = 0;
		const restart = () => {
			elapsed = 0;
			autoCamera = true;
			view.setPose([8, 5, 38], [0, 0, -12]);
			setPaused(false);
			setFinished(false);
			view.invalidate();
		};
		replay.current = restart;
		view.onReset(restart);
		view.start((dt, reduced) => {
			if (!params.current.paused && !reduced)
				elapsed = Math.min(16, elapsed + dt);
			if (elapsed >= 16 && !params.current.paused) setFinished(true);
			const t = reduced ? 16 : elapsed,
				pit = Math.min(1, Math.max(0, (t - 4) / 4));
			eye.update(
				false,
				{ choroid: false, sclera: false, nerve: t >= 12 },
				t >= 9,
			);
			mesh.morphTargetInfluences![0] = pit;
			mesh.material.wireframe = t < 2;
			if (autoCamera && !reduced && t >= 12 && t <= 14) {
				const f = THREE.MathUtils.smoothstep(t, 12, 14);
				view.setPose([8 + 18 * f, 5 + 9 * f, 38 - 8 * f], [0, 0, -12]);
			}
			const vessels = eye.group.getObjectByName("retinal-vessels");
			vessels?.traverse((o) => {
				if (o instanceof THREE.Mesh && o.name === "vessel-stroke") {
					(o.geometry as THREE.InstancedBufferGeometry).instanceCount =
						Math.floor(THREE.MathUtils.clamp((t - 9) / 3, 0, 1) * 80);
				}
				if (o instanceof THREE.Mesh && o.geometry instanceof THREE.TubeGeometry)
					o.geometry.setDrawRange(
						0,
						Math.floor(THREE.MathUtils.clamp((t - 9) / 3, 0, 1) * 80) * 6 * 6,
					);
			});
			if (profile.current) {
				profile.current.hidden = t < 4;
				const path = profile.current.querySelector("[data-pit-profile]");
				path?.setAttribute(
					"d",
					Array.from({ length: 81 }, (_, i) => {
						const x = -1 + i / 40;
						return `${i ? "L" : "M"}${110 + x * 100},${25 + pit * 10 * Math.exp(-((x / 0.65) ** 2))}`;
					}).join(" "),
				);
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
					autoCamera,
					elapsed,
				},
				animating: !reduced && !params.current.paused && elapsed < 16,
			};
		});
		return () => {
			replay.current = null;
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
				{error && (
					<p role="status">
						{es ? "WebGL no está disponible." : "WebGL is unavailable."}
					</p>
				)}
				<p className="retina-camera" ref={caption} />
				<div className="retina-pit-inset" ref={profile} hidden>
					<span>
						{es ? "Perfil foveal ampliado" : "Magnified foveal profile"}
					</span>
					<svg
						viewBox="0 0 220 78"
						role="img"
						aria-label={
							es
								? "Depresión de 0,10 mm; EPR fijo"
								: "0.10 mm depression; fixed RPE"
						}
					>
						<path d="M10 25H210" stroke="#b1c5c3" strokeDasharray="3 4" />
						<path
							data-pit-profile
							d="M10 25H210"
							stroke="#e8b197"
							strokeWidth="2"
							fill="none"
						/>
						<path d="M10 55H210" stroke="#97745d" strokeWidth="5" />
						<text
							x="110"
							y="75"
							textAnchor="middle"
							fill="currentColor"
							fontSize="11"
						>
							{es
								? "Misma escala en ambos ejes · EPR"
								: "Equal axis scales · RPE"}
						</text>
					</svg>
				</div>
			</div>
			<div className="lens-controls">
				<button
					type="button"
					className="lens-motion-pause"
					aria-pressed={finished ? undefined : paused}
					onClick={() => (finished ? replay.current?.() : setPaused(!paused))}
				>
					{finished
						? es
							? "Repetir"
							: "Replay"
						: paused
							? es
								? "Continuar"
								: "Resume"
							: es
								? "Pausar"
								: "Pause"}
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
