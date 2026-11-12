import "../lens/lens.css";
import "../retina/retina.css";
import "./motility.css";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createLensScene } from "../lens/lensScene";
import { CUP_CENTRE_Z } from "../retina/retinaModel";
import {
	createExtraocularMuscles,
	createMotilityEye,
} from "./motilityGeometry";
import {
	animatedGaze,
	gazePose,
	gazeTargets,
	type MuscleId,
	muscles,
} from "./motilityModel";
export default function ExtraocularDemo({
	lang = "en",
	motion = false,
}: {
	lang?: "en" | "es";
	motion?: boolean;
}) {
	const es = lang === "es",
		mount = useRef<HTMLDivElement>(null),
		cue = useRef<HTMLDivElement>(null);
	const viewRef = useRef<ReturnType<typeof createLensScene> | null>(null);
	const [selected, setSelected] = useState<MuscleId | "all">("all"),
		[pose, setPose] = useState("auto"),
		[paused, setPaused] = useState(false),
		[error, setError] = useState(false);
	const params = useRef({ selected, pose, paused });
	useEffect(() => {
		params.current = { selected, pose, paused };
		viewRef.current?.invalidate();
	}, [selected, pose, paused]);
	useEffect(() => {
		if (!mount.current) return;
		let view: ReturnType<typeof createLensScene>;
		try {
			view = createLensScene(mount.current, 76, lang);
		} catch {
			setError(true);
			return;
		}
		viewRef.current = view;
		view.scene.traverse((o) => {
			if (o instanceof THREE.Light) o.intensity *= 0.65;
		});
		view.camera.position.set(
			motion ? 20 : 45,
			motion ? 15 : 26,
			motion ? 65 : 50,
		);
		view.controls.target.set(0, 0, -12);
		const pivot = new THREE.Group();
		pivot.position.z = CUP_CENTRE_Z;
		pivot.add(createMotilityEye());
		view.scene.add(pivot);
		const apparatus = createExtraocularMuscles();
		view.scene.add(apparatus.group);
		let elapsed = 0,
			lastMuscle: MuscleId | "all" | null = null;
		const previous = new THREE.Quaternion(0, 0, 0, 0);
		view.onReset(() => {
			elapsed = 0;
			params.current = { selected: "all", pose: "auto", paused: false };
			setSelected("all");
			setPose("auto");
			setPaused(false);
		});
		view.start((dt, reduced) => {
			const p = params.current;
			const fov = view.camera.aspect < 1.2 ? 48 : 35;
			if (fov !== view.camera.fov) {
				view.camera.fov = fov;
				view.camera.updateProjectionMatrix();
			}
			const animated = motion && p.pose === "auto" && !reduced;
			if (animated && !p.paused) elapsed += dt;
			const staticIndex = Number.isFinite(Number(p.pose))
				? Math.max(
						0,
						Math.min(gazeTargets.length - 1, Math.round(Number(p.pose))),
					)
				: 0;
			const gaze = animated
				? animatedGaze(elapsed)
				: { ...gazeTargets[staticIndex]!, index: staticIndex };
			const q = gazePose(motion ? gaze.h : 0, motion ? gaze.v : 0);
			pivot.quaternion.copy(q);
			if (Math.abs(previous.dot(q)) < 1 - 1e-10 || lastMuscle !== p.selected) {
				apparatus.update(q, p.selected);
				previous.copy(q);
				lastMuscle = p.selected;
			}
			if (cue.current) {
				const dot = cue.current.querySelector("circle");
				dot?.setAttribute("cx", String(30 + gaze.h));
				dot?.setAttribute("cy", String(30 - gaze.v));
				const text = cue.current.querySelector("output");
				if (text)
					text.textContent = `H ${gaze.h.toFixed(1)}° · V ${gaze.v.toFixed(1)}°`;
			}
			return {
				animating: animated && !p.paused,
				state: {
					model:
						"Head-fixed kinematic eye; orbital anchors and muscle dimensions schematic; no force solver",
					horizontalDeg: motion ? gaze.h : 0,
					verticalDeg: motion ? gaze.v : 0,
					quaternion: q.toArray(),
					selectedMuscle: p.selected,
					mode: p.pose,
					orbitAnchors: "fixed",
					relaxedAnteriorSegment: true,
				},
			};
		});
		return () => {
			viewRef.current = null;
			view.dispose();
		};
	}, [lang, motion]);
	const muscle = muscles.find((m) => m.id === selected);
	return (
		<div className="lens-demo retina-demo motility-demo">
			<div className="lens-heading">
				<strong>
					{motion
						? es
							? "Orientar el ojo"
							: "Orient the eye"
						: es
							? "Seis músculos alrededor del globo"
							: "Six muscles around the globe"}
				</strong>
				<span className="lens-muted">
					{es ? "Ojo derecho esquemático" : "Schematic right eye"}
				</span>
			</div>
			<div
				className="lens-scene"
				ref={mount}
				role="img"
				aria-label={
					es
						? "Globo ocular con cuatro rectos, dos oblicuos y tróclea"
						: "Eyeball with four recti, two obliques and a trochlea"
				}
			>
				{error && (
					<p role="status">
						{es ? "WebGL no está disponible." : "WebGL is unavailable."}
					</p>
				)}
				{motion && (
					<div ref={cue} className="motility-target">
						<svg viewBox="0 0 60 60" aria-hidden="true">
							<path d="M5 30H55M30 5V55" stroke="currentColor" opacity="0.4" />
							<circle cx="30" cy="30" r="3" fill="currentColor" />
						</svg>
						<output>H 0° · V 0°</output>
						<span>{es ? "Objetivo prescrito" : "Prescribed target"}</span>
					</div>
				)}
			</div>
			<p className="retina-reading">
				{muscle
					? `${es ? muscle.es : muscle.en} · ${es ? muscle.actionEs : muscle.action} · ${es ? "Nervio" : "CN"} ${muscle.nerve}`
					: es
						? "Gira la vista para seguir los rectos hacia atrás. El oblicuo superior cambia de dirección en la tróclea; el inferior nace delante, en el suelo orbitario."
						: "Orbit the view to follow the recti backwards. The superior oblique turns at the trochlea; the inferior oblique starts anteriorly on the orbital floor."}
			</p>
			<div className="lens-controls">
				<label>
					{es ? "Músculo" : "Muscle"}
					<select
						value={selected}
						onChange={(e) => setSelected(e.target.value as MuscleId | "all")}
					>
						<option value="all">{es ? "Todos" : "All"}</option>
						{muscles.map((m) => (
							<option key={m.id} value={m.id}>
								{es ? m.es : m.en}
							</option>
						))}
					</select>
				</label>
				{motion && (
					<label>
						{es ? "Mirada" : "Gaze"}
						<select value={pose} onChange={(e) => setPose(e.target.value)}>
							<option value="auto">
								{es ? "Secuencia automática" : "Automatic sequence"}
							</option>
							{gazeTargets.map((g, i) => (
								<option key={g.en} value={i}>
									{es ? g.es : g.en}
								</option>
							))}
						</select>
					</label>
				)}
				{motion && pose === "auto" && (
					<button
						type="button"
						className="lens-motion-pause"
						aria-pressed={paused}
						onClick={() => setPaused(!paused)}
					>
						{paused ? (es ? "Continuar" : "Resume") : es ? "Pausar" : "Pause"}
					</button>
				)}
				<p className="lens-note">
					{es
						? "Inserciones y guías orbitales elegidas para el dibujo. Las rutas se adaptan a una rotación prescrita; no calculan activación, fuerza ni resultados quirúrgicos."
						: "Insertion and orbital-guide positions are drawing choices. Paths follow a prescribed rotation; they do not calculate activation, force or surgical outcomes."}
				</p>
			</div>
		</div>
	);
}
