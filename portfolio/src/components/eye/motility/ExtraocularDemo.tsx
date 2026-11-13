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
	gazePose,
	gazeTargets,
	highlightedMuscles,
	type MuscleId,
	type MuscleSelection,
	muscles,
} from "./motilityModel";
import {
	advance,
	anatomy,
	type Condition,
	equilibrium,
	evaluate,
	mechanicalState,
	musclePath,
	orientation,
	recruitment,
} from "./orbitalMechanics";

const conditions = [
	["baseline", "Baseline", "Referencia"],
	[
		"lr-weakness",
		"Right lateral rectus weakness",
		"Debilidad del recto lateral derecho",
	],
	[
		"so-weakness",
		"Right superior oblique weakness",
		"Debilidad del oblicuo superior derecho",
	],
	[
		"ir-restriction",
		"Right inferior rectus restriction",
		"Restricción del recto inferior derecho",
	],
] as const;
export default function ExtraocularDemo({
	lang = "en",
	motion = false,
}: {
	lang?: "en" | "es";
	motion?: boolean;
}) {
	const es = lang === "es",
		mount = useRef<HTMLDivElement>(null);
	const [measurements, setMeasurements] = useState<{
		summary: string;
		forces: Record<MuscleId, number>;
	} | null>(null);
	const viewRef = useRef<ReturnType<typeof createLensScene> | null>(null);
	const [selected, setSelected] = useState<MuscleSelection>(
			motion ? "all" : "horizontal",
		),
		[target, setTarget] = useState("0"),
		[condition, setCondition] = useState<Condition>("baseline"),
		[error, setError] = useState(false);
	const params = useRef({ selected, target, condition });
	useEffect(() => {
		params.current = { selected, target, condition };
		viewRef.current?.invalidate();
	}, [selected, target, condition]);
	useEffect(() => {
		if (!mount.current) return;
		let view: ReturnType<typeof createLensScene>;
		try {
			view = createLensScene(mount.current, motion ? 115 : 88, lang);
		} catch {
			setError(true);
			return;
		}
		viewRef.current = view;
		view.camera.far = 400;
		view.camera.updateProjectionMatrix();
		view.camera.position.set(
			motion ? 0 : 54,
			motion ? 8 : 28,
			motion ? 112 : -8,
		);
		view.controls.target.set(0, 0, -14);
		view.scene.traverse((o) => {
			if (o instanceof THREE.Light) o.intensity *= 0.65;
		});
		const eyes = Array.from({ length: motion ? 2 : 1 }, (_, i) => {
			const orbit = new THREE.Group();
			orbit.position.x = motion ? (i === 0 ? -32 : 32) : 0;
			if (i === 1) orbit.scale.x = -1;
			const pivot = new THREE.Group();
			pivot.position.z = CUP_CENTRE_Z;
			pivot.add(createMotilityEye());
			orbit.add(pivot);
			const apparatus = createExtraocularMuscles();
			orbit.add(apparatus.group);
			view.scene.add(orbit);
			return {
				pivot,
				apparatus,
				goal: new THREE.Quaternion(),
				dynamics: mechanicalState(
					new THREE.Quaternion(),
					recruitment(new THREE.Quaternion()).activation,
				),
				command: recruitment(new THREE.Quaternion()).activation,
				previous: new THREE.Quaternion(0, 0, 0, 0),
			};
		});
		const reference = evaluate(
			new THREE.Quaternion(),
			recruitment(new THREE.Quaternion()).activation,
		);
		const arrows = motion
			? []
			: muscles.map((m) => {
					const path = musclePath(m.id, new THREE.Quaternion());
					const arrow = new THREE.ArrowHelper(
						path.direction,
						anatomy[m.id].insertion
							.clone()
							.add(new THREE.Vector3(0, 0, CUP_CENTRE_Z)),
						reference.forces[m.id].total * 35,
						0xe4bc79,
						0.8,
						0.4,
					);
					for (const part of [arrow.line, arrow.cone]) {
						for (const material of Array.isArray(part.material)
							? part.material
							: [part.material]) {
							material.depthTest = false;
							material.depthWrite = false;
							material.transparent = true;
							material.opacity = 0.9;
						}
						part.renderOrder = 20;
					}
					view.scene.add(arrow);
					return { id: m.id, arrow };
				});
		let key = "",
			report: object = {},
			lastMuscle: MuscleSelection | null = null;
		view.onReset(() => {
			setSelected(motion ? "all" : "horizontal");
			setTarget("0");
			setCondition("baseline");
			params.current = {
				selected: motion ? "all" : "horizontal",
				target: "0",
				condition: "baseline",
			};
			key = "";
		});
		view.start((dt, reduced) => {
			const p = params.current,
				newKey = `${p.target}/${p.condition}`;
			const fov = view.camera.aspect < 1.2 ? 52 : 35;
			if (view.camera.fov !== fov) {
				view.camera.fov = fov;
				view.camera.updateProjectionMatrix();
			}
			if (newKey !== key) {
				key = newKey;
				const gaze = gazeTargets[Number(p.target)] ?? gazeTargets[0];
				const targetQ = gazePose(motion ? gaze.h : 0, motion ? gaze.v : 0),
					rightCommand = recruitment(targetQ);
				const right = equilibrium(
					rightCommand.activation,
					motion ? p.condition : "baseline",
					targetQ,
				);
				const leftTarget = gazePose(-gaze.h, gaze.v),
					leftCommand = recruitment(leftTarget),
					left = equilibrium(leftCommand.activation, "baseline", leftTarget);
				const valid =
					right.converged &&
					left.converged &&
					rightCommand.residual < 1e-7 &&
					leftCommand.residual < 1e-7;
				if (valid) {
					eyes[0]!.goal.copy(right.q);
					eyes[0]!.command = rightCommand.activation;
					if (eyes[1]) eyes[1].command = leftCommand.activation;
					eyes[1]?.goal.copy(left.q);
				}
				const angles = orientation(right.q),
					desired = orientation(targetQ);
				report = {
					model:
						"Binocular muscle-force equilibrium and dynamics; fixed pulleys; unvalidated saccade timing",
					condition: p.condition,
					targetDeg: { h: gaze.h, v: gaze.v },
					right: {
						...angles,
						activation: rightCommand.activation,
						forces: right.forces,
						residualNm: right.torque.length(),
						converged: right.converged,
					},
					left: {
						...orientation(left.q),
						residualNm: left.torque.length(),
						converged: left.converged,
					},
					controllerResidualNm: rightCommand.residual,
					interocularDistanceMm: 64,
				};
				if (motion)
					setMeasurements({
						summary: valid
							? `H ${(angles.horizontal - desired.horizontal).toFixed(1)}° · V ${(angles.vertical - desired.vertical).toFixed(1)}° · ${es ? "Torsión" : "Torsion"} ${(angles.torsion - desired.torsion).toFixed(1)}°`
							: es
								? "No se encontró un equilibrio fiable."
								: "No reliable equilibrium found.",
						forces: Object.fromEntries(
							muscles.map((m) => [m.id, right.forces[m.id].total]),
						) as Record<MuscleId, number>,
					});
			}
			let animating = false;
			for (const [index, eye] of eyes.entries()) {
				if (reduced || !motion) {
					eye.dynamics = mechanicalState(eye.goal, eye.command);
				} else
					advance(
						eye.dynamics,
						eye.command,
						index === 0 ? p.condition : "baseline",
						dt,
					);
				eye.pivot.quaternion.copy(eye.dynamics.q);
				if (
					eye.pivot.quaternion.angleTo(eye.goal) > 1e-4 ||
					eye.dynamics.omega.length() > 1e-4
				)
					animating = true;
				if (
					Math.abs(eye.previous.dot(eye.pivot.quaternion)) < 1 - 1e-10 ||
					p.selected !== lastMuscle
				) {
					eye.apparatus.update(eye.pivot.quaternion, p.selected);
					eye.previous.copy(eye.pivot.quaternion);
				}
			}
			for (const item of arrows)
				item.arrow.visible = highlightedMuscles(p.selected).includes(item.id);
			lastMuscle = p.selected;
			return {
				animating,
				state: {
					...report,
					currentEyes: eyes.map((e) => ({
						...orientation(e.dynamics.q),
						angularVelocityRadS: e.dynamics.omega.toArray(),
					})),
					selectedMuscle: p.selected,
					displayTransition: animating
						? "Integrating muscle torque, inertia and damping"
						: "Settled",
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
							? "Equilibrio entre los músculos"
							: "Balance between muscles"
						: es
							? "Cómo tiran los músculos"
							: "How the muscles pull"}
				</strong>
				<span className="lens-muted">
					{motion
						? es
							? "Dos ojos · fijación lejana"
							: "Two eyes · distance fixation"
						: es
							? "Ojo derecho"
							: "Right eye"}
				</span>
			</div>
			<div
				className="lens-scene"
				ref={mount}
				role="img"
				aria-label={
					es
						? "Músculos extraoculares e inserciones"
						: "Extraocular muscles and attachments"
				}
			>
				{error && (
					<p role="status">
						{es ? "WebGL no está disponible." : "WebGL is unavailable."}
					</p>
				)}
			</div>
			{motion ? (
				<div className="motility-measurements">
					<span>
						{es
							? "Desviación de equilibrio del ojo derecho respecto a la fijación"
							: "Right-eye equilibrium deviation from fixation"}
					</span>
					<output aria-live="polite">{measurements?.summary}</output>
					<div className="motility-forces">
						{muscles.map((m) => (
							<span key={m.id} data-force={m.id}>
								{measurements
									? `${m.id} ${measurements.forces[m.id].toFixed(3)} N`
									: ""}
							</span>
						))}
					</div>
				</div>
			) : (
				<p className="retina-reading">
					{muscle
						? `${es ? muscle.es : muscle.en} · ${es ? muscle.actionEs : muscle.action} · CN ${muscle.nerve}`
						: es
							? "Empieza por el par horizontal y compara después los rectos verticales y los oblicuos. Las flechas doradas superpuestas muestran la dirección de tracción y la tensión relativa en equilibrio primario."
							: "Start with the horizontal pair, then compare the vertical recti and obliques. Overlaid gold arrows show pulling direction and relative tension at primary-position equilibrium."}
				</p>
			)}
			<div className="lens-controls">
				{motion ? (
					<>
						<label>
							{es ? "Mirada" : "Gaze"}
							<select
								value={target}
								onChange={(e) => setTarget(e.target.value)}
							>
								{gazeTargets.map((g, i) => (
									<option key={g.en} value={i}>
										{i === 0
											? es
												? "Posición primaria"
												: "Primary position"
											: es
												? g.es
												: g.en}
									</option>
								))}
							</select>
						</label>
						<label>
							{es ? "Condición del modelo" : "Model condition"}
							<select
								value={condition}
								onChange={(e) => setCondition(e.target.value as Condition)}
							>
								{conditions.map((c) => (
									<option key={c[0]} value={c[0]}>
										{es ? c[2] : c[1]}
									</option>
								))}
							</select>
						</label>
					</>
				) : (
					<label>
						{es ? "Músculo" : "Muscle"}
						<select
							value={selected}
							onChange={(e) => setSelected(e.target.value as MuscleSelection)}
						>
							<option value="horizontal">
								{es ? "Primero: par horizontal" : "First: horizontal pair"}
							</option>
							<option value="vertical">
								{es ? "Después: rectos verticales" : "Then: vertical recti"}
							</option>
							<option value="obliques">
								{es ? "Añadir torsión: oblicuos" : "Add torsion: obliques"}
							</option>
							<option value="all">{es ? "Todos" : "All"}</option>
							{muscles.map((m) => (
								<option key={m.id} value={m.id}>
									{es ? m.es : m.en}
								</option>
							))}
						</select>
					</label>
				)}
				<p className="lens-note">
					{motion
						? es
							? "Movimiento entre equilibrios impulsado por fuerzas. Debilidad: 25 % de fuerza activa. Restricción: resistencia pasiva ×4. Valores elegidos para explorar el modelo, no predicciones clínicas."
							: "Force-driven motion between equilibria. Weakness: 25% active force. Restriction: passive resistance ×4. Chosen model perturbations, not clinical predictions."
						: es
							? "Los seis músculos siguen en el cálculo de fuerzas. Escala gráfica de las flechas: 35 mm por N. Coordenadas UPAT adaptadas al globo; poleas fijas y contornos musculares ilustrativos."
							: "All six muscles remain in the force calculation. Arrow length: 35 mm per N as a drawing scale. UPAT reference coordinates adapted to our globe; fixed pulleys and illustrative muscle contours."}
				</p>
			</div>
		</div>
	);
}
