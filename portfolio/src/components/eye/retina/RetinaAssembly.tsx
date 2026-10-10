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
	return (
		<div className="lens-demo retina-demo">
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
							view.camera.position.set(0, 0, 40);
							view.controls.target.set(0, 0, -12);
							view.controls.update();
							view.invalidate();
						}}
					>
						{es ? "Ver retina" : "Retinal view"}
					</button>
					<button
						type="button"
						aria-pressed={section}
						onClick={() => setSection(!section)}
					>
						{es ? "Sección" : "Section"}
					</button>
					<button
						type="button"
						aria-pressed={choroid}
						onClick={() => setChoroid(!choroid)}
					>
						{es ? "Coroides" : "Choroid"}
					</button>
					<button
						type="button"
						aria-pressed={sclera}
						onClick={() => setSclera(!sclera)}
					>
						{es ? "Esclerótica" : "Sclera"}
					</button>
					<button
						type="button"
						aria-pressed={nerve}
						onClick={() => setNerve(!nerve)}
					>
						{es ? "Nervio óptico" : "Optic nerve"}
					</button>
					<button
						type="button"
						aria-pressed={anterior}
						onClick={() => setAnterior(!anterior)}
					>
						{es ? "Córnea, iris y cristalino" : "Cornea, iris and lens"}
					</button>
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
				<p className="lens-note">
					{es
						? "Ver retina muestra los puntos numerados: fóvea en el centro de la mácula y papila hacia nasal. Relieve foveal en la malla; vasos principales estilizados. ACD interno, cristalino relajado; AXL hasta el límite que representa el EPR. No es biometría clínica."
						: "Retinal view shows the numbered landmarks: fovea within the macula, disc towards nasal. The pit deforms the mesh; major vessels are stylised. Internal ACD, relaxed lens; AXL ends at the boundary representing the RPE. These are model dimensions, not clinical biometry."}
				</p>
			</div>
		</div>
	);
}
