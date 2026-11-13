import { Pause, Play, RotateCcw } from "lucide-react";
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
		profile = useRef<HTMLDivElement>(null),
		timeline = useRef<HTMLInputElement>(null);
	const [paused, setPaused] = useState(false),
		[error, setError] = useState(false),
		[finished, setFinished] = useState(false);
	const replay = useRef<(() => void) | null>(null);
	const seek = useRef<number | null>(null);
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
		view.scene.traverse((o) => {
			if (o instanceof THREE.HemisphereLight) {
				o.color.set("#fff9ef");
				o.groundColor.set("#554d46");
				o.intensity = 1.6;
			}
		});
		view.camera.position.set(8, 5, 38);
		view.controls.target.set(0, 0, -12);
		const eye = createPosteriorEye();
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

		let elapsed = 0,
			ended = false,
			previousMaterial: boolean | undefined;
		const restart = () => {
			elapsed = 0;
			ended = false;
			seek.current = null;
			autoCamera = true;
			view.setPose([8, 5, 38], [0, 0, -12]);
			setPaused(false);
			setFinished(false);
			view.invalidate();
		};
		replay.current = restart;
		view.onReset(restart);
		view.start((dt, reduced) => {
			if (seek.current !== null) {
				elapsed = seek.current;
				seek.current = null;
			}
			if (!params.current.paused && !reduced)
				elapsed = Math.min(24, elapsed + dt);
			if (elapsed >= 24 && !ended) {
				ended = true;
				setFinished(true);
			}
			const t = reduced && !params.current.paused ? 24 : elapsed,
				pit = Math.min(1, Math.max(0, (t - 4) / 4));
			eye.update(
				t >= 16,
				{ choroid: t >= 16, sclera: t >= 20, nerve: t >= 12 },
				t >= 9,
			);
			mesh.morphTargetInfluences![0] = pit;
			mesh.material.wireframe = t < 2;
			mesh.material.vertexColors = t >= 2;
			mesh.material.color.set(t < 2 ? "#b9c6c2" : "#ffffff");
			if (previousMaterial !== t >= 2) {
				mesh.material.needsUpdate = true;
				previousMaterial = t >= 2;
			}
			if (autoCamera && !reduced && t >= 14 && t <= 18) {
				const f = THREE.MathUtils.smoothstep(t, 14, 18);
				view.setPose([8 + 22 * f, 5 + 19 * f, 38 - 16 * f], [0, 0, -12]);
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
				profile.current.hidden = t < 4 || t >= 16;
				const path = profile.current.querySelector("[data-pit-profile]");
				path?.setAttribute(
					"d",
					Array.from({ length: 81 }, (_, i) => {
						const x = -1 + i / 40;
						return `${i ? "L" : "M"}${110 + x * 100},${25 + pit * 10 * Math.exp(-((x / 0.65) ** 2))}`;
					}).join(" "),
				);
			}

			if (timeline.current) timeline.current.value = String(t);
			const stage =
				t < 2
					? 0
					: t < 4
						? 1
						: t < 9
							? 2
							: t < 12
								? 3
								: t < 16
									? 4
									: t < 20
										? 5
										: 6;
			if (caption.current)
				caption.current.textContent = (
					es
						? [
								"Malla",
								"Material y pigmentación ilustrativa",
								"Relieve foveal",
								"Vasos principales",
								"Salida del nervio óptico",
								"Coroides: la cubierta vascular",
								"Esclerótica: cerramos la pared",
							]
						: [
								"Mesh",
								"Material and illustrative pigmentation",
								"Foveal relief",
								"Major vessels",
								"Optic nerve exit",
								"Choroid: the vascular coat",
								"Sclera: close the wall",
							]
				)[stage]!;
			return {
				state: {
					model: "Continuous wall construction using final assembly meshes",
					stage,
					pit,
					autoCamera,
					elapsed,
				},
				animating: !reduced && !params.current.paused && elapsed < 24,
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
					{es ? "De la malla a la pared ocular" : "From mesh to eye wall"}
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
				<label>
					{es ? "Construcción" : "Construction"}
					<input
						ref={timeline}
						type="range"
						min="0"
						max="24"
						step="0.1"
						defaultValue="0"
						aria-label={es ? "Etapa de construcción" : "Construction stage"}
						onChange={(e) => {
							seek.current = Number(e.target.value);
							params.current.paused = true;
							setPaused(true);
							setFinished(false);
							viewRef.current?.invalidate();
						}}
					/>
				</label>
				<button
					type="button"
					className="lens-motion-pause"
					aria-pressed={finished ? undefined : paused}
					onClick={() => (finished ? replay.current?.() : setPaused(!paused))}
				>
					{finished ? (
						<RotateCcw size={14} aria-hidden="true" />
					) : paused ? (
						<Play size={14} aria-hidden="true" />
					) : (
						<Pause size={14} aria-hidden="true" />
					)}
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
