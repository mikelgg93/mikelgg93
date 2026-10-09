import "./lens.css";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
	assemblyIrisMaterial,
	createAssemblyCornea,
	createAssemblyIris,
	updateAssemblyIris,
} from "./anteriorEyeGeometry";
import { createCiliaryApparatus } from "./ciliaryApparatus";
import { createIntraocularLens } from "./intraocularLens";
import LensViews from "./LensViews";
import { createLensScene } from "./lensScene";

type Mode = "assembled" | "section" | "exploded";
export default function LensAssembly({ lang = "en" }: { lang?: "en" | "es" }) {
	const es = lang === "es",
		mount = useRef<HTMLDivElement>(null);
	const viewRef = useRef<ReturnType<typeof createLensScene> | null>(null);
	const [hideSupport, setHideSupport] = useState(false);
	const [implant, setImplant] = useState(false);
	const [mode, setMode] = useState<Mode>("assembled");
	const [pupil, setPupil] = useState(4),
		[accommodation, setAccommodation] = useState(0),
		[error, setError] = useState(false);
	const params = useRef({ mode, pupil, accommodation, hideSupport, implant });
	useEffect(() => {
		params.current = { mode, pupil, accommodation, hideSupport, implant };
		viewRef.current?.invalidate();
	}, [mode, pupil, accommodation, hideSupport, implant]);
	useEffect(() => {
		if (!mount.current) return;
		let view: ReturnType<typeof createLensScene>;
		try {
			view = createLensScene(mount.current, 33, lang);
		} catch {
			setError(true);
			return;
		}
		viewRef.current = view;
		view.camera.position.set(18, 13, 24);
		const apparatus = createCiliaryApparatus();
		view.scene.add(apparatus.group);
		const iol = createIntraocularLens();
		view.scene.add(iol.group);
		const corneaMaterial = new THREE.MeshPhongMaterial({
			color: 0xb8e9ed,
			transparent: true,
			opacity: 0.08,
			side: THREE.DoubleSide,
			depthWrite: false,
			shininess: 120,
			specular: 0xffffff,
		});
		const cornea = new THREE.Mesh(createAssemblyCornea(), corneaMaterial);
		view.scene.add(cornea);
		const irisAppearance = assemblyIrisMaterial();
		const iris = new THREE.Mesh(createAssemblyIris(), irisAppearance.material);
		view.scene.add(iris);
		const clipping = [new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)];
		let shown = params.current.accommodation,
			lastPupil = -1,
			lastMode: Mode | undefined;
		view.start((dt, reducedMotion) => {
			const p = params.current;
			const target = p.implant ? 0 : p.accommodation;
			shown +=
				(target - shown) * (reducedMotion ? 1 : 1 - Math.exp(-dt / 0.25));
			if (Math.abs(target - shown) < 1e-4) shown = target;
			apparatus.update(shown, p.mode === "section", false);
			apparatus.support.visible = !p.hideSupport;
			apparatus.lens.visible = !p.implant;
			iol.group.visible = p.implant;
			iol.setSection(p.mode === "section");
			if (p.pupil !== lastPupil) {
				updateAssemblyIris(iris.geometry, p.pupil);
				irisAppearance.pupil.value = p.pupil / 2;
				lastPupil = p.pupil;
			}
			if (p.mode !== lastMode) {
				for (const m of [corneaMaterial, irisAppearance.material]) {
					m.clippingPlanes = p.mode === "section" ? clipping : [];
					m.needsUpdate = true;
				}
				cornea.position.z = p.mode === "exploded" ? 5 : 0;
				iris.position.z = p.mode === "exploded" ? 2.7 : 0;
				lastMode = p.mode;
			}
			return {
				state: {
					model:
						"Anterior-eye assembly; separate pupil and illustrative accommodation controls, no coupled optical solver",
					mode: p.mode,
					pupilDiameter: p.pupil,
					accommodation: shown,
					implant: p.implant,
					hideSupport: p.hideSupport,
				},
				animating: shown !== target,
			};
		});
		return () => {
			viewRef.current = null;
			view.dispose();
		};
	}, [lang]);
	function changeMode(value: Mode) {
		setMode(value);
		const view = viewRef.current;
		view?.setView(value === "section" ? "section" : "reset");
		if (view && value === "exploded") {
			view.camera.position.set(33, 8, 12);
			view.controls.target.set(0, 0, 2.5);
			view.controls.update();
			view.invalidate();
		}
	}
	return (
		<div className="lens-demo">
			<div className="lens-heading">
				<strong>
					{es ? "Las tres piezas, juntas" : "The three parts, together"}
				</strong>
				<span className="lens-muted">
					{es ? "Córnea · iris · cristalino" : "Cornea · iris · lens"}
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
							? "Modelo del segmento anterior con córnea, iris, cristalino y músculo ciliar"
							: "Anterior-eye model with cornea, iris, lens and ciliary muscle"
					}
				/>
			)}
			<div className="lens-legend">
				<span>{es ? "Cúpula transparente: córnea" : "Clear dome: cornea"}</span>
				<span>{es ? "Disco pigmentado: iris" : "Pigmented disc: iris"}</span>
				<span>
					{es ? "Detrás de la pupila: cristalino" : "Behind the pupil: lens"}
				</span>
			</div>
			<div className="lens-controls">
				<div className="lens-buttons">
					<button
						type="button"
						aria-pressed={hideSupport}
						onClick={() => setHideSupport(!hideSupport)}
					>
						{hideSupport
							? es
								? "Mostrar músculo y zónulas"
								: "Show muscle & zonules"
							: es
								? "Ocultar músculo y zónulas"
								: "Hide muscle & zonules"}
					</button>
					<button
						type="button"
						aria-pressed={!implant}
						onClick={() => setImplant(false)}
					>
						{es ? "Cristalino natural" : "Natural lens"}
					</button>
					<button
						type="button"
						aria-pressed={implant}
						onClick={() => {
							setImplant(true);
							changeMode("section");
						}}
					>
						{es ? "LIO y cápsula" : "IOL + capsule"}
					</button>
				</div>
				<div className="lens-buttons">
					{(["assembled", "section", "exploded"] as const).map((value, i) => (
						<button
							key={value}
							type="button"
							aria-pressed={mode === value}
							onClick={() => changeMode(value)}
						>
							{
								(es
									? ["Juntas", "Abrir el ojo", "Separar las piezas"]
									: ["Assembled", "Open the eye", "Separate the parts"])[i]
							}
						</button>
					))}
				</div>
				<LensViews
					lang={lang}
					section={mode === "section"}
					onView={(v) => viewRef.current?.setView(v)}
				/>
				<label>
					<span className="lens-value">
						<span>{es ? "Diámetro pupilar" : "Pupil diameter"}</span>
						<output>{pupil.toFixed(1)} mm</output>
					</span>
					<input
						type="range"
						min="2"
						max="8"
						step="0.1"
						value={pupil}
						onChange={(e) => setPupil(Number(e.target.value))}
					/>
				</label>
				<label>
					<span className="lens-value">
						<span>{es ? "Acomodación del modelo" : "Model accommodation"}</span>
						<output>
							{implant
								? es
									? "Fija"
									: "Fixed"
								: `${accommodation.toFixed(1)} D`}
						</output>
					</span>
					<input
						type="range"
						min="0"
						disabled={implant}
						max="8"
						step="0.1"
						value={accommodation}
						onChange={(e) => setAccommodation(Number(e.target.value))}
					/>
				</label>
				{implant && (
					<p className="lens-note">
						{es
							? "LIO monofocal genérica: la óptica central y sus hápticos se alojan en el saco capsular conservado, detrás del iris. El borde dorado marca la abertura anterior de la cápsula. Este implante no cambia de forma para acomodar. Geometría ilustrativa, no un diseño comercial."
							: "Generic monofocal IOL: the central optic and its supporting haptics sit in the retained capsular bag, behind the iris. The gold rim marks the front capsule opening. This implant does not change shape to accommodate. Illustrative geometry, not a commercial design."}
					</p>
				)}
				<p className="lens-note">
					{es
						? "Los controles de pupila y acomodación son independientes. Esta composición muestra posición y forma; no calcula la óptica del ojo completo. La vista separada aumenta los espacios para ver las piezas."
						: "Pupil and accommodation are independent controls. This assembly shows position and shape; it does not calculate whole-eye optics. The separated view enlarges the gaps to expose the parts."}
				</p>
			</div>
		</div>
	);
}
