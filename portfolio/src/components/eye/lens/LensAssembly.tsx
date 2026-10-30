import "./lens.css";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { CORNEAL_APEX_Z, POSTERIOR_CORNEAL_APEX_Z } from "../eyeDimensions";
import { focusDemand, nearPupil } from "./accommodationCycle";
import {
	assemblyIrisMaterial,
	createAssemblyCornea,
	createAssemblyIris,
	createAssemblySclera,
	createWallSection,
	updateAssemblyIris,
} from "./anteriorEyeGeometry";
import { createCiliaryApparatus } from "./ciliaryApparatus";
import FocusCue, { updateFocusCue } from "./FocusCue";
import { lensSurfaceZ } from "./lensConstruction";
import { createLensScene } from "./lensScene";

export default function LensAssembly({ lang = "en" }: { lang?: "en" | "es" }) {
	const es = lang === "es",
		mount = useRef<HTMLDivElement>(null);
	const cue = useRef<HTMLDivElement>(null);
	const viewRef = useRef<ReturnType<typeof createLensScene> | null>(null);
	const [paused, setPaused] = useState(false);
	const [near, setNear] = useState(false);
	const nearRef = useRef(false);
	useEffect(() => {
		nearRef.current = near;
		viewRef.current?.invalidate();
	}, [near]);
	const [error, setError] = useState(false);
	const pauseRef = useRef(paused);
	useEffect(() => {
		pauseRef.current = paused;
		viewRef.current?.invalidate();
	}, [paused]);
	useEffect(() => {
		if (!mount.current) return;
		let view: ReturnType<typeof createLensScene>;
		try {
			view = createLensScene(mount.current, 40, lang);
		} catch {
			setError(true);
			return;
		}
		viewRef.current = view;
		view.camera.up.set(0, 0, 1);
		view.camera.position.set(
			-7.8583603312173755,
			36.6379485369128,
			-14.796854392384283,
		);
		const apparatus = createCiliaryApparatus();
		view.scene.add(apparatus.group);
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
		const scleraMaterial = new THREE.MeshPhongMaterial({
			color: 0xd9d6c9,
			shininess: 12,
			side: THREE.DoubleSide,
		});
		const sclera = new THREE.Mesh(createAssemblySclera(), scleraMaterial);
		view.scene.add(sclera);
		const wallSection = createWallSection(
			sclera.geometry,
			scleraMaterial.clone(),
		);
		const corneaSection = createWallSection(
			cornea.geometry,
			new THREE.MeshBasicMaterial({ color: 0x90bbba, side: THREE.DoubleSide }),
		);
		view.scene.add(wallSection, corneaSection);
		const irisAppearance = assemblyIrisMaterial();
		const iris = new THREE.Mesh(createAssemblyIris(), irisAppearance.material);
		view.scene.add(iris);
		const clipping = [new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)];
		for (const material of [
			corneaMaterial,
			irisAppearance.material,
			scleraMaterial,
		])
			material.clippingPlanes = clipping;
		let elapsed = 0,
			shown = 0,
			pupil = nearPupil(0);
		view.onReset(() => {
			elapsed = 0;
			nearRef.current = false;
			setNear(false);
			shown = 0;
			pupil = nearPupil(0);
			pauseRef.current = false;
			setPaused(false);
		});
		view.start((dt, reducedMotion) => {
			const moving = !pauseRef.current && !reducedMotion;
			if (moving) elapsed += dt;
			const target = reducedMotion
				? nearRef.current
					? 6
					: 0
				: focusDemand(elapsed);
			if (reducedMotion) {
				shown = target;
				pupil = nearPupil(shown);
			}
			if (moving) {
				shown += (target - shown) * (1 - Math.exp(-dt / 0.25));
				pupil += (nearPupil(shown) - pupil) * (1 - Math.exp(-dt / 0.35));
			}
			const shape = apparatus.update(shown, true, false);
			updateAssemblyIris(iris.geometry, pupil, shown);
			irisAppearance.pupil.value = pupil / 2;
			updateFocusCue(cue.current, target, shown);
			return {
				state: {
					model:
						"Anterior-eye cutaway; illustrative coupled accommodation and near miosis, not a whole-eye optical solver",
					mode: "section",
					pupilDiameter: pupil,
					accommodation: shown,
					demand: target,
					paused: !moving,
					modelDimensionsMm: {
						centralCornealThickness: CORNEAL_APEX_Z - POSTERIOR_CORNEAL_APEX_Z,
						anteriorChamberDepth:
							POSTERIOR_CORNEAL_APEX_Z -
							(lensSurfaceZ(0) * shape.thickness) / 2,
						lensThickness: shape.thickness,
					},
				},
				animating: moving,
			};
		});
		return () => {
			viewRef.current = null;
			view.dispose();
		};
	}, [lang]);
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
			<div className="lens-animated-scene">
				{error ? (
					<p role="status">
						{es ? "WebGL no está disponible." : "WebGL is unavailable."}
					</p>
				) : (
					<div
						ref={mount}
						className="lens-scene"
						role="img"
						aria-label={
							es
								? "Ojo abierto: acomodación y constricción pupilar coordinadas al enfocar de cerca"
								: "Open eye: coordinated accommodation and pupil constriction during near focus"
						}
					/>
				)}
				<FocusCue
					cueRef={cue}
					lang={lang}
					paused={paused}
					near={near}
					onNear={() => setNear(!near)}
					onPause={() => setPaused(!paused)}
				/>
			</div>
			<div className="lens-legend">
				<span>{es ? "Cúpula transparente: córnea" : "Clear dome: cornea"}</span>
				<span>{es ? "Pared blanca: esclera" : "White wall: sclera"}</span>
				<span>{es ? "Disco pigmentado: iris" : "Pigmented disc: iris"}</span>
				<span>
					{es ? "Detrás de la pupila: cristalino" : "Behind the pupil: lens"}
				</span>
			</div>
		</div>
	);
}
