import "./lens.css";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import LensViews from "./LensViews";
import { clearLensMaterial } from "./lensMaterial";
import { createLensGeometry, createLensScene } from "./lensScene";

type CataractType = "nuclear" | "cortical" | "posterior";

// Surface alpha/noise is a visual cue for opacity, not a light-scattering solver.
function cloudMaterial(color: number) {
	return new THREE.ShaderMaterial({
		transparent: true,
		depthWrite: false,
		uniforms: {
			amount: { value: 0.7 },
			tint: { value: new THREE.Color(color) },
		},
		vertexShader: `varying vec3 point; varying vec3 normalView;
		void main() { point = position; normalView = normalMatrix * normal;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
		fragmentShader: `varying vec3 point; varying vec3 normalView;
		uniform float amount; uniform vec3 tint;
		float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
		float noise(vec3 p) {
		 vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
		 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
		 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
		}
		void main() {
		 float cloud = 0.6*noise(point*7.0) + 0.4*noise(point*23.0);
		 float light = 0.6 + 0.4*abs(dot(normalize(normalView),normalize(vec3(-0.3,0.5,1.0))));
		 gl_FragColor = vec4(mix(tint,vec3(1.0),cloud*0.3)*light, amount*(0.45+0.5*cloud));
		 #include <tonemapping_fragment>
		 #include <colorspace_fragment>
		}`,
	});
}

export default function LensCataract({ lang = "en" }: { lang?: "en" | "es" }) {
	const es = lang === "es";
	const mount = useRef<HTMLDivElement>(null);
	const viewRef = useRef<ReturnType<typeof createLensScene> | null>(null);
	const [type, setType] = useState<CataractType>("nuclear");
	const [opacity, setOpacity] = useState(0.7);
	const previousOpacity = useRef(0.7);
	const [error, setError] = useState(false);
	const params = useRef({ type, opacity });
	useEffect(() => {
		params.current = { type, opacity };
		if (opacity > 0) previousOpacity.current = opacity;
		viewRef.current?.invalidate();
	}, [type, opacity]);
	useEffect(() => {
		if (!mount.current) return;
		let view: ReturnType<typeof createLensScene>;
		try {
			view = createLensScene(mount.current, 23, lang);
		} catch {
			setError(true);
			return;
		}
		viewRef.current = view;
		const shape = createLensGeometry();
		const shell = new THREE.Mesh(shape, clearLensMaterial());
		shell.scale.set(4.6, 4.6, 1.8);
		view.scene.add(shell);
		const edge = new THREE.LineLoop(
			new THREE.BufferGeometry().setFromPoints(
				Array.from(
					{ length: 128 },
					(_, i) =>
						new THREE.Vector3(
							4.6 * Math.cos((i / 128) * Math.PI * 2),
							4.6 * Math.sin((i / 128) * Math.PI * 2),
							0,
						),
				),
			),
			new THREE.LineBasicMaterial({
				color: 0xe6e6ca,
				transparent: true,
				opacity: 0.6,
			}),
		);
		view.scene.add(edge);
		const nuclearMaterial = cloudMaterial(0xc6ac6c);
		const corticalMaterial = cloudMaterial(0xe8eee4);
		const posteriorMaterial = cloudMaterial(0xf3e4c9);
		const nucleus = new THREE.Mesh(shape, nuclearMaterial);
		nucleus.scale.set(3, 3, 1.18);
		view.scene.add(nucleus);
		const cortical = new THREE.Group();
		const spot = new THREE.SphereGeometry(1, 32, 16);
		for (let i = 0; i < 12; i++) {
			const angle = (i / 12) * Math.PI * 2 + Math.sin(i * 5) * 0.08;
			const spoke = new THREE.Mesh(spot, corticalMaterial);
			spoke.scale.set(
				1.15 + 0.12 * Math.sin(i),
				0.12 + 0.04 * Math.cos(i),
				0.16,
			);
			spoke.position.set(
				3 * Math.cos(angle),
				3 * Math.sin(angle),
				Math.sin(i * 4) * 0.2,
			);
			spoke.rotation.z = angle;
			cortical.add(spoke);
		}
		view.scene.add(cortical);
		const posterior = new THREE.Mesh(spot, posteriorMaterial);
		posterior.scale.set(1.08, 1.08, 0.04);
		posterior.position.z = -1.96;
		view.scene.add(posterior);
		view.start(() => {
			const p = params.current;
			nucleus.visible = p.type === "nuclear" && p.opacity > 0;
			cortical.visible = p.type === "cortical" && p.opacity > 0;
			posterior.visible = p.type === "posterior" && p.opacity > 0;
			for (const material of [
				nuclearMaterial,
				corticalMaterial,
				posteriorMaterial,
			])
				material.uniforms.amount!.value = p.opacity;
			return {
				state: {
					model:
						"Illustrative opacity distribution; no scattering or visual-acuity prediction",
					opacityPattern: p.type,
					illustrativeOpacity: p.opacity,
				},
			};
		});
		return () => {
			viewRef.current = null;
			view.dispose();
		};
	}, [lang]);
	const descriptions = {
		nuclear: es
			? "Nuclear: opacidad central, aquí con un tono amarillento."
			: "Nuclear: central opacity, shown here with yellowing.",
		cortical: es
			? "Cortical: radios o cuñas en la corteza periférica."
			: "Cortical: spoke-like or wedge-shaped opacities in the peripheral cortex.",
		posterior: es
			? "Subcapsular posterior: una placa justo por delante de la cápsula posterior."
			: "Posterior subcapsular: a patch just in front of the posterior capsule.",
	};
	return (
		<div className="lens-demo">
			<div className="lens-heading">
				<strong>
					{es
						? "Cuando el cristalino pierde transparencia"
						: "When the lens loses transparency"}
				</strong>
				<span className="lens-muted">
					{es ? "Arrastra para girar" : "Drag to orbit"}
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
						opacity === 0
							? es
								? "Cristalino transparente para comparar"
								: "Clear lens for comparison"
							: descriptions[type]
					}
				/>
			)}
			<div className="lens-controls">
				<LensViews
					lang={lang}
					onView={(view) => viewRef.current?.setView(view)}
				/>
				<div className="lens-buttons">
					{(["nuclear", "cortical", "posterior"] as const).map((value) => (
						<button
							key={value}
							type="button"
							aria-pressed={type === value}
							onClick={() => setType(value)}
						>
							{value === "nuclear"
								? "Nuclear"
								: value === "cortical"
									? "Cortical"
									: es
										? "Subcapsular posterior"
										: "Posterior subcapsular"}
						</button>
					))}
				</div>
				<p className="lens-note" aria-live="polite">
					{descriptions[type]}
				</p>
				<label>
					<span className="lens-value">
						<span>{es ? "Opacidad ilustrativa" : "Illustrative opacity"}</span>
						<output>{Math.round(opacity * 100)} / 100</output>
					</span>
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						value={opacity}
						onChange={(e) => setOpacity(Number(e.target.value))}
					/>
				</label>
				<div className="lens-buttons">
					<button
						type="button"
						aria-pressed={opacity === 0}
						onClick={() =>
							setOpacity(opacity === 0 ? previousOpacity.current : 0)
						}
					>
						{opacity === 0
							? es
								? "Añadir opacidad"
								: "Add opacity"
							: es
								? "Comparar con transparente"
								: "Compare with clear"}
					</button>
					<button
						type="button"
						onClick={() =>
							viewRef.current?.setView(type === "posterior" ? "back" : "front")
						}
					>
						{es ? "Ver la zona afectada" : "Face the affected region"}
					</button>
				</div>
				<p className="lens-note">
					{es
						? "Patrones ilustrativos: no son grados clínicos ni una simulación de lo que ve una persona. En un mismo ojo pueden coexistir varios tipos."
						: "Illustrative patterns, not clinical grades or a simulation of a person's vision. Multiple types can coexist in one eye."}
				</p>
			</div>
		</div>
	);
}
