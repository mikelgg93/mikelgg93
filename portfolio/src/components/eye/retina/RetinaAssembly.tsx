import ParameterControl, { useInitialParameters } from "../ParameterControl";
import "../lens/lens.css";
import "./retina.css";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { CORNEAL_APEX_Z } from "../eyeDimensions";
import {
	assemblyIrisMaterial,
	createAssemblyCornea,
	createAssemblyIris,
} from "../lens/anteriorEyeGeometry";
import { createCiliaryApparatus } from "../lens/ciliaryApparatus";
import { createLensScene } from "../lens/lensScene";
import { createPosteriorEye, eyeCoats } from "./posteriorEye";
import { biometry, retinalLandmarks } from "./retinaAnatomy";
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
	const [section, setSection] = useState(true),
		[anterior, setAnterior] = useState(true),
		[choroid, setChoroid] = useState(true),
		[sclera, setSclera] = useState(true),
		[nerve, setNerve] = useState(true),
		[error, setError] = useState(false);
	const params = useRef({ section, anterior, choroid, sclera, nerve });
	useEffect(() => {
		params.current = { section, anterior, choroid, sclera, nerve };
		viewRef.current?.invalidate();
	}, [section, anterior, choroid, sclera, nerve]);
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
		view.camera.position.set(34, 35, 34);
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
				opacity: 0.12,
				side: THREE.DoubleSide,
				depthWrite: false,
				shininess: 100,
			}),
		);
		front.add(cornea);
		const cut = [new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)];
		let previous: boolean | undefined;
		view.start(() => {
			const p = params.current;
			front.visible = p.anterior;
			posterior.update(p.section, p);
			anatomy.update(0, p.section, false);
			if (p.section !== previous) {
				for (const material of [iris.material, cornea.material]) {
					material.clippingPlanes = p.section ? cut : [];
					material.needsUpdate = true;
				}
				previous = p.section;
			}
			return {
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
					biometry,
				},
			};
		});
		return () => {
			viewRef.current = null;
			view.dispose();
		};
	}, [lang]);
	const resetAnchor = useRef<HTMLDivElement>(null);
	const defaults = useInitialParameters(
		{ section, anterior, choroid, sclera, nerve },
		(initial) => {
			setSection(initial.section);
			setAnterior(initial.anterior);
			setChoroid(initial.choroid);
			setSclera(initial.sclera);
			setNerve(initial.nerve);
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
			<p className="retina-reading">
				{retinalLandmarks
					.map((landmark, i) => `${i + 1}. ${es ? landmark.es : landmark.en}`)
					.join(" · ")}
			</p>
			<div
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
					<ParameterControl
						hideReset
						value={section}
						initial={defaults.section}
						onReset={setSection}
						label="section view"
						lang={lang}
					>
						<button
							type="button"
							onClick={() => {
								setSection(false);
								setAnterior(false);
								setChoroid(false);
								setSclera(false);
								const view = viewRef.current;
								if (!view) return;
								view.setView("front");
								view.camera.position.set(6, 2, 38);
								view.controls.target.set(0, 0, -12);
								view.controls.update();
								view.invalidate();
							}}
						>
							{es ? "Ver retina" : "Retinal view"}
						</button>
					</ParameterControl>
					<button
						type="button"
						aria-pressed={section}
						onClick={() => setSection(!section)}
					>
						{es ? "Sección" : "Section"}
					</button>
				</div>
				<details className="lens-display-options">
					<summary>{es ? "Capas y restablecer" : "Layers and reset"}</summary>
					<div className="lens-options">
						<ParameterControl
							hideReset
							value={choroid}
							initial={defaults.choroid}
							onReset={setChoroid}
							label="choroid visibility"
							lang={lang}
						>
							<label>
								<input
									type="checkbox"
									checked={choroid}
									onChange={(e) => setChoroid(e.target.checked)}
								/>
								{es ? "Coroides" : "Choroid"}
							</label>
						</ParameterControl>
						<ParameterControl
							hideReset
							value={sclera}
							initial={defaults.sclera}
							onReset={setSclera}
							label="sclera visibility"
							lang={lang}
						>
							<label>
								<input
									type="checkbox"
									checked={sclera}
									onChange={(e) => setSclera(e.target.checked)}
								/>
								{es ? "Esclerótica" : "Sclera"}
							</label>
						</ParameterControl>
						<ParameterControl
							hideReset
							value={nerve}
							initial={defaults.nerve}
							onReset={setNerve}
							label="optic nerve visibility"
							lang={lang}
						>
							<label>
								<input
									type="checkbox"
									checked={nerve}
									onChange={(e) => setNerve(e.target.checked)}
								/>
								{es ? "Nervio óptico" : "Optic nerve"}
							</label>
						</ParameterControl>
						<ParameterControl
							hideReset
							value={anterior}
							initial={defaults.anterior}
							onReset={setAnterior}
							label="anterior segment visibility"
							lang={lang}
						>
							<label>
								<input
									type="checkbox"
									checked={anterior}
									onChange={(e) => setAnterior(e.target.checked)}
								/>
								{es ? "Córnea, iris y cristalino" : "Cornea, iris and lens"}
							</label>
						</ParameterControl>
						<button
							type="button"
							onClick={() => {
								const view = viewRef.current;
								if (!view) return;
								setSection(true);
								setAnterior(true);
								setChoroid(true);
								setSclera(true);
								setNerve(true);
								view.setView("reset");
								view.controls.target.set(0, 0, -8);
								view.controls.update();
								view.invalidate();
							}}
						>
							{es ? "Restablecer vista" : "Reset view"}
						</button>
					</div>
				</details>
				<p className="lens-note">
					{es
						? "Ver retina muestra los puntos numerados: fóvea en el centro de la mácula y papila hacia nasal. Relieve foveal en la malla; vasos principales estilizados. ACD interno, cristalino relajado; AXL hasta el límite que representa el EPR. No es biometría clínica."
						: "Retinal view shows the numbered landmarks: fovea within the macula, disc towards nasal. The pit deforms the mesh; major vessels are stylised. Internal ACD, relaxed lens; AXL ends at the boundary representing the RPE. These are model dimensions, not clinical biometry."}
				</p>
				<p className="lens-note">
					<a
						href={
							es
								? "#convertir-la-superficie-en-tejido"
								: "#turn-the-surface-into-a-tissue"
						}
					>
						{es
							? "Ver la sección foveal ampliada"
							: "See the magnified foveal section"}
					</a>
					{es
						? ": aquí el relieve sigue a escala del ojo."
						: ": here the relief stays at whole-eye scale."}
				</p>
			</div>
		</div>
	);
}
