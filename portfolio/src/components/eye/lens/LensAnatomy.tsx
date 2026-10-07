import "./lens.css";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { disposeThree } from "../disposeThree";
import { observeThreeResize } from "../threeResize";
import { lensShape, MAX_ACCOMMODATION } from "./lensModel";

export default function LensAnatomy({ lang = "en" }: { lang?: "en" | "es" }) {
	const es = lang === "es";
	const mount = useRef<HTMLDivElement>(null);
	const [accommodation, setAccommodation] = useState(0);
	const [cutaway, setCutaway] = useState(false);
	const [error, setError] = useState(false);
	const parameters = useRef({ accommodation, cutaway });
	useEffect(() => {
		parameters.current = { accommodation, cutaway };
	}, [accommodation, cutaway]);

	useEffect(() => {
		const container = mount.current;
		if (!container) return;
		let renderer: THREE.WebGLRenderer;
		try {
			renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		} catch {
			setError(true);
			return;
		}
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setSize(container.clientWidth, container.clientHeight);
		renderer.localClippingEnabled = true;
		container.appendChild(renderer.domElement);
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(
			35,
			container.clientWidth / Math.max(1, container.clientHeight),
			0.1,
			100,
		);
		camera.position.set(11, 9, 22);
		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.enablePan = false;
		controls.minDistance = 20;
		controls.maxDistance = 38;
		scene.add(new THREE.HemisphereLight(0xcdf4ff, 0x102323, 2.3));
		const light = new THREE.DirectionalLight(0xffffff, 3);
		light.position.set(-5, 7, 12);
		scene.add(light);

		// A schematic biconvex ellipsoid. The posterior half is more curved.
		// Geometry is allocated once; accommodation changes scales and buffers.
		const lensGroup = new THREE.Group();
		const shapeGeometry = new THREE.SphereGeometry(1, 64, 32);
		const positions = shapeGeometry.getAttribute("position");
		for (let i = 0; i < positions.count; i++) {
			const z = positions.getZ(i);
			positions.setZ(i, z * (z > 0 ? 0.85 : 1.15));
		}
		shapeGeometry.computeVertexNormals();
		const shellMaterial = new THREE.MeshPhongMaterial({
			color: 0x77dfe0,
			specular: 0xffffff,
			shininess: 90,
			transparent: true,
			opacity: 0.28,
			depthWrite: false,
			side: THREE.DoubleSide,
		});
		const shell = new THREE.Mesh(shapeGeometry, shellMaterial);
		const coreMaterial = new THREE.MeshPhongMaterial({
			color: 0xf3c987,
			shininess: 65,
			transparent: true,
			opacity: 0.8,
		});
		const core = new THREE.Mesh(shapeGeometry, coreMaterial);
		core.scale.set(0.7, 0.7, 0.66);
		lensGroup.add(shell, core);

		const outlineMaterial = new THREE.LineBasicMaterial({
			color: 0x9cffff,
			transparent: true,
			opacity: 0.55,
		});
		for (let meridian = 0; meridian < 6; meridian++) {
			const angle = (meridian / 6) * Math.PI;
			const points = Array.from({ length: 129 }, (_, i) => {
				const t = (i / 128) * Math.PI * 2;
				const z = Math.sin(t);
				return new THREE.Vector3(
					Math.cos(t) * Math.cos(angle),
					Math.cos(t) * Math.sin(angle),
					z * (z > 0 ? 0.85 : 1.15),
				);
			});
			lensGroup.add(
				new THREE.Line(
					new THREE.BufferGeometry().setFromPoints(points),
					outlineMaterial,
				),
			);
		}
		scene.add(lensGroup);

		const ring = new THREE.Mesh(
			new THREE.TorusGeometry(1, 0.035, 16, 128),
			new THREE.MeshPhongMaterial({ color: 0xe18b7a, shininess: 35 }),
		);
		scene.add(ring);
		const zonules = new THREE.Group();
		const zonuleMaterial = new THREE.LineBasicMaterial({
			color: 0xf9d889,
			transparent: true,
			opacity: 0.7,
		});
		// Two representative sets of attachments, not the full zonular network.
		for (let i = 0; i < 64; i++) {
			const geometry = new THREE.BufferGeometry();
			geometry.setAttribute(
				"position",
				new THREE.BufferAttribute(new Float32Array(17 * 3), 3),
			);
			zonules.add(new THREE.Line(geometry, zonuleMaterial));
		}
		scene.add(zonules);
		const clipping = [new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)];
		const resize = observeThreeResize(container, renderer, camera);
		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
		const debug = container
			.closest(".interactive-viewer")
			?.querySelector(".debug-output");
		let shownAccommodation = parameters.current.accommodation;
		let lastTime = performance.now();
		let frame = 0;
		let lastDebug = 0;
		let lastCutaway = false;
		let visible = true;
		const visibility = new IntersectionObserver(([entry]) => {
			visible = entry?.isIntersecting ?? false;
		});
		visibility.observe(container);

		function animate(now: number) {
			frame = requestAnimationFrame(animate);
			const dt = Math.min((now - lastTime) / 1000, 0.1);
			lastTime = now;
			if (!visible || document.hidden) return;
			const target = parameters.current;
			// 0.25 s is an animation choice, not an accommodation time constant.
			shownAccommodation +=
				(target.accommodation - shownAccommodation) *
				(reducedMotion.matches ? 1 : 1 - Math.exp(-dt / 0.25));
			const shape = lensShape(shownAccommodation);
			lensGroup.scale.set(
				shape.lensRadius,
				shape.lensRadius,
				shape.thickness / 2,
			);
			ring.scale.set(shape.ringRadius, shape.ringRadius, 7);
			if (target.cutaway !== lastCutaway) {
				for (const material of [shellMaterial, coreMaterial, outlineMaterial]) {
					material.clippingPlanes = target.cutaway ? clipping : [];
					material.needsUpdate = true;
				}
				lastCutaway = target.cutaway;
			}
			zonules.children.forEach((child, i) => {
				const line = child as THREE.Line;
				const attribute = line.geometry.getAttribute("position");
				const angle = ((i % 32) / 32) * Math.PI * 2;
				const side = i < 32 ? 1 : -1;
				const attachmentZ =
					(shape.thickness / 2) *
					(side > 0 ? 0.85 : 1.15) *
					Math.sqrt(1 - 0.98 ** 2);
				for (let j = 0; j <= 16; j++) {
					const t = j / 16;
					const radius = THREE.MathUtils.lerp(
						shape.lensRadius * 0.98,
						shape.ringRadius,
						t,
					);
					// Small bowing is a visual cue for reduced load, not a force calculation.
					const z =
						side *
						((1 - t) * attachmentZ +
							Math.sin(t * Math.PI) * 0.2 * shape.fraction);
					attribute.setXYZ(
						j,
						radius * Math.cos(angle),
						radius * Math.sin(angle),
						z,
					);
				}
				attribute.needsUpdate = true;
				line.geometry.computeBoundingSphere();
			});
			controls.update();
			renderer.render(scene, camera);
			if (debug && now - lastDebug > 500) {
				debug.textContent = JSON.stringify(
					{
						model: "Illustrative lens geometry; no optical ray tracing",
						accommodation: shownAccommodation,
						...shape,
						camera: camera.position.toArray(),
						geometries: renderer.info.memory.geometries,
					},
					null,
					2,
				);
				lastDebug = now;
			}
		}
		frame = requestAnimationFrame(animate);
		return () => {
			cancelAnimationFrame(frame);
			visibility.disconnect();
			resize.disconnect();
			controls.dispose();
			disposeThree(scene);
			renderer.dispose();
			// This island owns its context. Release Three's internal scratch
			// framebuffers/default textures as well when leaving the article.
			renderer.forceContextLoss();
			renderer.domElement.remove();
		};
	}, []);

	return (
		<div className="lens-demo">
			<div className="lens-heading">
				<strong>
					{es ? "La lente y su suspensión" : "The lens and its suspension"}
				</strong>
				<span className="lens-muted">
					{es ? "Arrastra para girar" : "Drag to orbit"}
				</span>
			</div>
			{error ? (
				<p className="p-4" role="status">
					{es
						? "WebGL no está disponible. El texto explica el mismo mecanismo."
						: "WebGL is unavailable. The article explains the same mechanism."}
				</p>
			) : (
				<div
					ref={mount}
					className="lens-scene"
					role="img"
					aria-label={
						es
							? "Modelo 3D del cristalino, las zónulas y el músculo ciliar"
							: "3D model of the lens, zonules and ciliary muscle"
					}
				/>
			)}
			<div className="lens-legend">
				<span
					className="lens-key"
					style={{ "--key-color": "#e18b7a" } as React.CSSProperties}
				>
					{es ? "Músculo ciliar" : "Ciliary muscle"}
				</span>
				<span
					className="lens-key"
					style={{ "--key-color": "#f9d889" } as React.CSSProperties}
				>
					{es ? "Zónulas" : "Zonules"}
				</span>
				<span
					className="lens-key"
					style={{ "--key-color": "#77dfe0" } as React.CSSProperties}
				>
					{es ? "Cristalino" : "Lens"}
				</span>
			</div>
			<div className="lens-controls">
				<label>
					<span className="lens-value">
						<span>{es ? "Acomodación del modelo" : "Model accommodation"}</span>
						<output>{accommodation.toFixed(1)} D</output>
					</span>
					<input
						type="range"
						min="0"
						max={MAX_ACCOMMODATION}
						step="0.1"
						value={accommodation}
						onChange={(e) => setAccommodation(Number(e.target.value))}
					/>
				</label>
				<div className="lens-buttons">
					<button
						type="button"
						aria-pressed={accommodation === 0}
						onClick={() => setAccommodation(0)}
					>
						{es ? "Lejos" : "Distance"}
					</button>
					<button
						type="button"
						aria-pressed={accommodation === 8}
						onClick={() => setAccommodation(8)}
					>
						{es ? "Cerca" : "Near"}
					</button>
					<button
						type="button"
						aria-pressed={cutaway}
						onClick={() => setCutaway(!cutaway)}
					>
						{es ? "Sección abierta" : "Open section"}
					</button>
				</div>
				<p className="lens-note">
					{es
						? "Geometría y colores ilustrativos. El núcleo dorado no representa una opacidad."
						: "Illustrative geometry and colours. The golden core does not represent an opacity."}
				</p>
			</div>
		</div>
	);
}
