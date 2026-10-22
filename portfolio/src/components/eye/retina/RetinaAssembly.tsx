import { useInitialParameters } from "../ParameterControl";
import "../lens/lens.css";
import "./retina.css";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { CORNEAL_APEX_Z } from "../eyeDimensions";
import { focusDemand, nearPupil } from "../lens/accommodationCycle";
import {
	assemblyIrisMaterial,
	createAssemblyCornea,
	createAssemblyIris,
	updateAssemblyIris,
} from "../lens/anteriorEyeGeometry";
import { createCiliaryApparatus } from "../lens/ciliaryApparatus";
import FocusCue, { updateFocusCue } from "../lens/FocusCue";
import { lensSurfaceZ } from "../lens/lensConstruction";
import { lensShape } from "../lens/lensModel";
import { createLensScene } from "../lens/lensScene";
import { createPosteriorEye, eyeCoats } from "./posteriorEye";
import RetinalFocusInset, {
	updateRetinalFocusInset,
} from "./RetinalFocusInset";
import { biometry, retinalLandmarks } from "./retinaAnatomy";
import { rayHeight, retinalFocus } from "./retinalFocus";
import { CUP_CENTRE_Z, CUP_RADIUS } from "./retinaModel";

export default function RetinaAssembly({
	lang = "en",
}: {
	lang?: "en" | "es";
}) {
	const es = lang === "es",
		mount = useRef<HTMLDivElement>(null),
		markers = useRef<(HTMLSpanElement | null)[]>([]),
		viewRef = useRef<ReturnType<typeof createLensScene> | null>(null);
	const focusInset = useRef<HTMLDivElement>(null);
	const cue = useRef<HTMLDivElement>(null),
		dimensions = useRef<HTMLDivElement>(null);
	const [paused, setPaused] = useState(false),
		[near, setNear] = useState(false),
		[focus, setFocus] = useState(false);
	const [section, setSection] = useState(true),
		[anterior, setAnterior] = useState(true),
		[choroid, setChoroid] = useState(true),
		[sclera, setSclera] = useState(true),
		[nerve, setNerve] = useState(true),
		[error, setError] = useState(false);
	const params = useRef({
		section,
		anterior,
		choroid,
		sclera,
		nerve,
		paused,
		near,
		focus,
	});
	useEffect(() => {
		params.current = {
			section,
			anterior,
			choroid,
			sclera,
			nerve,
			paused,
			near,
			focus,
		};
		viewRef.current?.invalidate();
	}, [section, anterior, choroid, sclera, nerve, paused, near, focus]);
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
		view.camera.position.set(34, 20, 18);
		view.controls.target.set(0, 0, -8);
		const posterior = createPosteriorEye();
		view.scene.add(posterior.group);
		const front = new THREE.Group();
		view.scene.add(front);
		const anatomy = createCiliaryApparatus();
		front.add(anatomy.group);
		const irisAppearance = assemblyIrisMaterial();
		const iris = new THREE.Mesh(createAssemblyIris(), irisAppearance.material);
		front.add(iris);
		const cornea = new THREE.Mesh(
			createAssemblyCornea(),
			new THREE.MeshPhongMaterial({
				color: 0xb8e9ed,
				transparent: true,
				opacity: 0.08,
				side: THREE.DoubleSide,
				depthWrite: false,
				shininess: 120,
				specular: 0xffffff,
			}),
		);
		front.add(cornea);
		const cut = [new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)];
		const raysGeometry = new THREE.BufferGeometry();
		const rayPositions = new Float32Array(8 * 2 * 3);
		raysGeometry.setAttribute(
			"position",
			new THREE.BufferAttribute(rayPositions, 3),
		);
		const rays = new THREE.LineSegments(
			raysGeometry,
			new THREE.LineBasicMaterial({
				color: 0xe4bc79,
				transparent: true,
				opacity: 0.65,
			}),
		);
		const principalGeometry = new THREE.BufferGeometry().setFromPoints(
			Array.from(
				{ length: 65 },
				(_, i) =>
					new THREE.Vector3(
						3 * Math.cos((i * Math.PI) / 32),
						3 * Math.sin((i * Math.PI) / 32),
						retinalFocus(0, 0).principalZ,
					),
			),
		);
		const principalPlane = new THREE.Line(
			principalGeometry,
			new THREE.LineDashedMaterial({
				color: 0xc6b1e7,
				depthTest: false,
				depthWrite: false,
				dashSize: 0.35,
				gapSize: 0.2,
			}),
		);
		principalPlane.computeLineDistances();
		principalPlane.renderOrder = 5;
		view.scene.add(principalPlane);
		rays.frustumCulled = false;
		view.scene.add(rays);
		let elapsed = 0,
			accommodation = 0,
			pupil = 5.8;
		view.onReset(() => {
			elapsed = 0;
			accommodation = 0;
			pupil = 5.8;
			setPaused(false);
			setNear(false);
			setFocus(false);
		});
		let previous: boolean | undefined;
		view.start((dt, reduced) => {
			const p = params.current;
			const fov = view.camera.aspect < 1.2 ? 47 : 35;
			if (view.camera.fov !== fov) {
				view.camera.fov = fov;
				view.camera.updateProjectionMatrix();
			}
			front.visible = p.anterior;
			posterior.update(p.section, p);
			if (!p.paused && !reduced) elapsed += dt;
			const demand = reduced ? (p.near ? 6 : 0) : focusDemand(elapsed);
			if (!p.paused || reduced) {
				accommodation +=
					(demand - accommodation) * (reduced ? 1 : 1 - Math.exp(-dt / 0.25));
				pupil +=
					(nearPupil(accommodation) - pupil) *
					(reduced ? 1 : 1 - Math.exp(-dt / 0.35));
			}
			anatomy.update(accommodation, p.section, false);
			updateAssemblyIris(iris.geometry, pupil, accommodation);
			irisAppearance.pupil.value = pupil / 2;
			updateFocusCue(cue.current, demand, accommodation);
			const shape = lensShape(accommodation);
			if (dimensions.current) {
				dimensions.current.children[1]!.textContent =
					`ACD ${(5.05 - (shape.thickness * lensSurfaceZ(0)) / 2).toFixed(2)} mm`;
				dimensions.current.children[2]!.textContent =
					`LT ${shape.thickness.toFixed(2)} mm`;
			}
			const optical = retinalFocus(demand, accommodation);
			updateRetinalFocusInset(focusInset.current, optical, pupil);
			rays.visible = p.focus;
			principalPlane.visible = p.focus;
			for (let i = 0; i < 8; i++) {
				const angle = (i * Math.PI * 2) / 8,
					r = pupil / 2,
					z = -3,
					ratio = (z - optical.focusZ) / (optical.principalZ - optical.focusZ);
				const endZ = Math.min(optical.focusZ, optical.retinalZ) - 0.3,
					endHeight = rayHeight(r, endZ, optical);
				rayPositions.set(
					[
						r * Math.cos(angle) * ratio,
						r * Math.sin(angle) * ratio,
						z,
						endHeight * Math.cos(angle),
						endHeight * Math.sin(angle),
						endZ,
					],
					i * 6,
				);
			}
			raysGeometry.attributes.position!.needsUpdate = true;
			if (p.section !== previous) {
				for (const material of [iris.material, cornea.material]) {
					material.clippingPlanes = p.section ? cut : [];
					material.needsUpdate = true;
				}
				previous = p.section;
			}
			return {
				animating: !reduced && !p.paused,
				afterRender() {
					retinalLandmarks.forEach((landmark, i) => {
						const marker = markers.current[i];
						if (!marker) return;
						const v = landmark.point.clone().project(view.camera);
						const show =
							!p.anterior &&
							!p.section &&
							!p.sclera &&
							view.camera.position.z > CUP_CENTRE_Z &&
							Math.abs(v.x) < 0.94 &&
							Math.abs(v.y) < 0.9 &&
							Math.abs(v.z) < 1;
						marker.hidden = !show;
						marker.style.left = `${(v.x + 1) * 50}%`;
						marker.style.top = `${(1 - v.y) * 50}%`;
					});
				},
				state: {
					model: "Anatomical assembly, no coupled ray tracing",
					section: p.section,
					anterior: p.anterior,
					choroid: p.choroid,
					sclera: p.sclera,
					nerve: p.nerve,
					cornealApexZ: CORNEAL_APEX_Z,
					retinalPoleZ: CUP_CENTRE_Z - CUP_RADIUS,
					biometry: {
						...biometry,
						lt: shape.thickness,
						acd: 5.05 - (shape.thickness * lensSurfaceZ(0)) / 2,
					},
					accommodation,
					pupilDiameter: pupil,
					focus: p.focus ? optical : null,
				},
			};
		});
		return () => {
			viewRef.current = null;
			view.dispose();
		};
	}, [lang]);
	const resetAnchor = useRef<HTMLDivElement>(null);
	useInitialParameters(
		{ section, anterior, choroid, sclera, nerve, paused, near, focus },
		(initial) => {
			setSection(initial.section);
			setAnterior(initial.anterior);
			setChoroid(initial.choroid);
			setSclera(initial.sclera);
			setNerve(initial.nerve);
			setPaused(initial.paused);
			setNear(initial.near);
			setFocus(initial.focus);
		},
		resetAnchor,
	);
	return (
		<div ref={resetAnchor} className="lens-demo retina-demo">
			<div className="lens-heading">
				<strong>
					{es
						? "La retina encuentra al resto del ojo"
						: "The retina meets the rest of the eye"}
				</strong>
				<span className="lens-muted">
					{es ? "Composición anatómica" : "Anatomical assembly"}
				</span>
			</div>
			<div
				className="lens-scene"
				ref={mount}
				role="img"
				aria-label={
					es
						? "Ojo esquemático con fóvea, mácula, vasos retinianos, coroides, esclerótica y nervio óptico"
						: "Schematic eye with fovea, macula, retinal vessels, choroid, sclera and optic nerve"
				}
			>
				{error && (
					<p role="status">
						{es ? "WebGL no está disponible." : "WebGL is unavailable."}
					</p>
				)}
				<FocusCue
					cueRef={cue}
					lang={lang}
					paused={paused}
					onPause={() => setPaused(!paused)}
					near={near}
					onNear={() => setNear(!near)}
				/>
				{retinalLandmarks.map((landmark, i) => (
					<span
						key={landmark.en}
						ref={(node) => {
							markers.current[i] = node;
						}}
						className="retina-landmark"
						hidden
						aria-hidden="true"
					>
						{i + 1}
					</span>
				))}
				<p className="retina-camera">
					{es
						? "Arrastra o enfoca el lienzo y usa las flechas para girar"
						: "Drag, or focus the canvas and use arrow keys to rotate"}
				</p>
			</div>
			<ul
				className="retina-bands retina-coat-key"
				aria-label={es ? "Clave de colores" : "Colour key"}
			>
				{eyeCoats.map((coat) => (
					<li key={coat.key}>
						<span className="retina-dot" style={{ background: coat.color }} />
						{es ? coat.es : coat.en}
					</li>
				))}
				<li>
					<span className="retina-dot" style={{ background: "#e4bc79" }} />
					{es ? "Nervio óptico" : "Optic nerve"}
				</li>
			</ul>
			{!anterior && (
				<p className="retina-reading">
					{retinalLandmarks
						.map((landmark, i) => `${i + 1}. ${es ? landmark.es : landmark.en}`)
						.join(" · ")}
				</p>
			)}
			<div
				ref={dimensions}
				className="retina-readouts"
				role="group"
				aria-label={es ? "Dimensiones del modelo" : "Model dimensions"}
			>
				<span>CCT {biometry.cct.toFixed(2)} mm</span>
				<span>ACD {biometry.acd.toFixed(2)} mm</span>
				<span>LT {biometry.lt.toFixed(2)} mm</span>
				<span>AXL → RPE {biometry.axl.toFixed(2)} mm</span>
			</div>
			<div className="lens-controls">
				<div className="lens-buttons">
					<label>
						{es ? "Vista" : "View"}{" "}
						<select
							value={anterior ? (section ? "section" : "whole") : "retina"}
							onChange={(e) => {
								const mode = e.target.value,
									retinal = mode === "retina";
								setSection(mode === "section");
								setAnterior(!retinal);
								setChoroid(!retinal);
								setSclera(!retinal);
								const view = viewRef.current;
								if (view) {
									view.setPose(retinal ? [6, 2, 38] : [34, 20, 18], [
										0,
										0,
										retinal ? -12 : -8,
									]);
								}
							}}
						>
							<option value="section">{es ? "Sección" : "Cutaway"}</option>
							<option value="retina">{es ? "Retina" : "Retina"}</option>
							<option value="whole">{es ? "Ojo completo" : "Whole eye"}</option>
						</select>
					</label>
					<button
						type="button"
						aria-pressed={focus}
						onClick={() => setFocus(!focus)}
					>
						{es ? "Enfoque de ojo reducido" : "Reduced-eye focus"}
					</button>
				</div>
				{focus && <RetinalFocusInset root={focusInset} lang={lang} />}
				{focus && (
					<p className="lens-note">
						{es
							? "El aro violeta marca el plano principal equivalente de un ojo reducido de 60 D (n = 4/3). Los rayos dorados muestran su convergencia en el vítreo: no se calculan a través de la córnea o el cristalino dibujados."
							: "The violet ring marks the equivalent principal plane of a 60 D reduced eye (n = 4/3). Gold rays show its convergence in the vitreous; they are not calculated through the displayed cornea or lens."}
					</p>
				)}
				<p className="lens-note">
					{es
						? "Acomodación y miosis próxima ilustrativas. ACD interna y LT cambian con la animación; AXL termina en el EPR. Dimensiones elegidas, no biometría clínica."
						: "Illustrative accommodation and near miosis. Internal ACD and LT follow the animation; AXL ends at the RPE. Chosen dimensions, not clinical biometry."}
				</p>
			</div>
		</div>
	);
}
