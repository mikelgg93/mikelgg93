import "../lens/lens.css";
import "./retina.css";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
	assemblyIrisMaterial,
	createAssemblyCornea,
	createAssemblyIris,
} from "../lens/anteriorEyeGeometry";
import { createCiliaryApparatus } from "../lens/ciliaryApparatus";
import { createLensScene } from "../lens/lensScene";
import { createRetinalCup, retinalMaterial } from "./retinaGeometry";

export default function RetinaAssembly({
	lang = "en",
}: {
	lang?: "en" | "es";
}) {
	const es = lang === "es",
		mount = useRef<HTMLDivElement>(null),
		viewRef = useRef<ReturnType<typeof createLensScene> | null>(null);
	const [section, setSection] = useState(true),
		[anterior, setAnterior] = useState(true),
		[error, setError] = useState(false);
	const params = useRef({ section, anterior });
	useEffect(() => {
		params.current = { section, anterior };
		viewRef.current?.invalidate();
	}, [section, anterior]);
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
		view.camera.position.set(31, 28, 35);
		view.controls.target.set(0, 0, -6);
		const cup = new THREE.Mesh(createRetinalCup(), retinalMaterial());
		view.scene.add(cup);
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
			anatomy.update(0, p.section, false);
			if (p.section !== previous) {
				for (const material of [cup.material, iris.material, cornea.material]) {
					material.clippingPlanes = p.section ? cut : [];
					material.needsUpdate = true;
				}
				previous = p.section;
			}
			return {
				state: {
					model: "Anatomical assembly, no coupled ray tracing",
					section: p.section,
					anterior: p.anterior,
					cornealApexZ: 5.6,
					retinalPoleZ: -18.4,
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
						? "Copa retiniana detrás de la córnea, el iris y el cristalino"
						: "Retinal cup behind the cornea, iris and lens"
				}
			>
				{error && (
					<p role="status">
						{es ? "WebGL no está disponible." : "WebGL is unavailable."}
					</p>
				)}
				<p className="retina-camera">
					{es
						? "Delante: córnea · detrás: copa retiniana"
						: "Front: cornea · back: retinal cup"}
				</p>
			</div>
			<div className="lens-controls">
				<div className="lens-buttons">
					<button
						type="button"
						aria-pressed={section}
						onClick={() => setSection(!section)}
					>
						{es ? "Sección" : "Section"}
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
							view.setView("reset");
							view.controls.target.set(0, 0, -6);
							view.controls.update();
							view.invalidate();
						}}
					>
						{es ? "Restablecer vista" : "Reset view"}
					</button>
				</div>
				<p className="lens-note">
					{es
						? "Se omiten la retina anterior, los vasos, el nervio óptico, la coroides y la esclerótica. Los detalles celulares requieren una escala aparte."
						: "Anterior retina, vessels, optic nerve, choroid and sclera are omitted. Cellular detail belongs at a separate scale."}
				</p>
			</div>
		</div>
	);
}
