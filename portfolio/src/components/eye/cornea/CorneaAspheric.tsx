import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { observeThreeResize } from "../threeResize";

const R = 7.8;
const MAX_R = 5.2; // wide aperture so the edge flattening is easy to see

// Three shapes worth comparing, each a single conic constant Q.
const PRESETS = [
	{
		id: "human",
		label: "Normal human",
		q: -0.26,
		hex: 0x22d3ee,
		note: "Prolate: steep center, flatter edges. Cancels most spherical aberration.",
	},
	{
		id: "sphere",
		label: "Perfect sphere",
		q: 0.0,
		hex: 0xa1a1aa,
		note: "Constant curvature. Edge rays overbend, so night lights bloom into halos.",
	},
	{
		id: "lasik",
		label: "Post-LASIK",
		q: 0.6,
		hex: 0xf43f5e,
		note: "Oblate: flatter center, steeper edges. Amplifies glare after surgery.",
	},
];

function sag(r: number, q: number) {
	const c = 1 / R;
	const root = 1 - (1 + q) * c * c * r * r;
	return root >= 0 ? (c * r * r) / (1 + Math.sqrt(root)) : NaN;
}

function buildGeometry(q: number, hex: number) {
	const radialSegments = 72;
	const angularSegments = 72;
	const vertices: number[] = [];
	const colors: number[] = [];
	const indices: number[] = [];
	const base = new THREE.Color(hex);
	const apex = new THREE.Color(0x34d399);

	for (let i = 0; i <= radialSegments; i++) {
		const r = (i / radialSegments) * MAX_R;
		let z = sag(r, q);
		if (Number.isNaN(z)) z = vertices[vertices.length - 1] ?? 0;
		const col = apex.clone().lerp(base, r / MAX_R);
		for (let j = 0; j <= angularSegments; j++) {
			const theta = (j / angularSegments) * Math.PI * 2;
			vertices.push(r * Math.cos(theta), r * Math.sin(theta), z);
			colors.push(col.r, col.g, col.b);
		}
	}

	for (let i = 0; i < radialSegments; i++) {
		for (let j = 0; j < angularSegments; j++) {
			const a = i * (angularSegments + 1) + j;
			const b = a + 1;
			const c2 = (i + 1) * (angularSegments + 1) + j;
			const d = c2 + 1;
			indices.push(a, b, d);
			indices.push(a, d, c2);
		}
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute(
		"position",
		new THREE.Float32BufferAttribute(vertices, 3),
	);
	geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
	geometry.setIndex(indices);
	geometry.computeVertexNormals();
	return geometry;
}

// The Q = 0 sphere profile in a plane, used as a fixed reference the shape
// visibly pulls away from at the edges.
function sphereProfile(planeYZ: boolean) {
	const pts: THREE.Vector3[] = [];
	for (let t = -MAX_R; t <= MAX_R; t += 0.1) {
		const z = sag(Math.abs(t), 0);
		pts.push(planeYZ ? new THREE.Vector3(0, t, z) : new THREE.Vector3(t, 0, z));
	}
	return new THREE.BufferGeometry().setFromPoints(pts);
}

export default function CorneaAspheric() {
	const mountRef = useRef<HTMLDivElement>(null);
	const [preset, setPreset] = useState(PRESETS[0]);
	const updateRef = useRef<((q: number, hex: number) => void) | null>(null);

	useEffect(() => {
		if (!mountRef.current) return;

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
		camera.position.set(6, 4, 18); // three-quarter view that shows the edge profile

		scene.add(new THREE.AmbientLight(0xffffff, 0.7));
		const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
		dirLight.position.set(5, 10, 10);
		scene.add(dirLight);

		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setClearColor(0x000000, 0);
		mountRef.current.appendChild(renderer.domElement);

		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;
		controls.target.set(0, 0, 0);

		const resizeObserver = observeThreeResize(
			mountRef.current,
			renderer,
			camera,
		);

		const material = new THREE.MeshStandardMaterial({
			vertexColors: true,
			roughness: 0.25,
			metalness: 0.1,
			transparent: true,
			opacity: 0.9,
			side: THREE.DoubleSide,
		});
		const wireMaterial = new THREE.MeshBasicMaterial({
			color: 0xffffff,
			wireframe: true,
			transparent: true,
			opacity: 0.12,
		});

		let geo = buildGeometry(preset.q, preset.hex);
		const mesh = new THREE.Mesh(geo, material);
		const wire = new THREE.Mesh(geo, wireMaterial);
		mesh.add(wire);
		scene.add(mesh);

		// Fixed dashed reference: where a perfect sphere (Q = 0) would sit.
		const refMat = new THREE.LineDashedMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 0.5,
			dashSize: 0.25,
			gapSize: 0.15,
		});
		[sphereProfile(false), sphereProfile(true)].forEach((g) => {
			const line = new THREE.Line(g, refMat);
			line.computeLineDistances();
			scene.add(line);
		});

		updateRef.current = (q: number, hex: number) => {
			const newGeo = buildGeometry(q, hex);
			mesh.geometry.dispose();
			mesh.geometry = newGeo;
			wire.geometry.dispose();
			wire.geometry = new THREE.WireframeGeometry(newGeo);
			geo = newGeo;
		};

		let animationFrameId: number;
		const animate = () => {
			animationFrameId = requestAnimationFrame(animate);
			controls.update();
			renderer.render(scene, camera);

			const debugEl = mountRef.current
				?.closest(".interactive-viewer")
				?.querySelector(".debug-output");
			if (debugEl) {
				const state = {
					camera: {
						position: {
							x: +camera.position.x.toFixed(3),
							y: +camera.position.y.toFixed(3),
							z: +camera.position.z.toFixed(3),
						},
					},
					target: {
						x: +controls.target.x.toFixed(3),
						y: +controls.target.y.toFixed(3),
						z: +controls.target.z.toFixed(3),
					},
				};
				(debugEl as HTMLElement).innerText = JSON.stringify(state, null, 2);
			}
		};
		animate();

		return () => {
			cancelAnimationFrame(animationFrameId);
			resizeObserver.disconnect();
			if (mountRef.current && renderer.domElement.parentNode) {
				mountRef.current.removeChild(renderer.domElement);
			}
			renderer.dispose();
			geo.dispose();
			material.dispose();
			wireMaterial.dispose();
			refMat.dispose();
			updateRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		updateRef.current?.(preset.q, preset.hex);
	}, [preset]);

	return (
		<div className="relative w-full h-[450px] md:h-[550px] bg-transparent overflow-hidden rounded-lg group">
			<div className="absolute top-4 left-4 z-10 flex flex-col items-start gap-1 pointer-events-none bg-card/80 backdrop-blur-md border border-border p-3 rounded-xl shadow-lg max-w-[240px]">
				<span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground border-b border-border/50 pb-1 w-full text-center mb-1">
					Asphericity (Q)
				</span>
				<div className="flex justify-between w-full text-xs">
					<span className="font-bold">Conic constant Q</span>
					<span
						className="font-mono font-bold"
						style={{ color: `#${preset.hex.toString(16)}` }}
					>
						{preset.q.toFixed(2)}
					</span>
				</div>
				<div className="text-[10px] text-muted-foreground mt-1">
					{preset.note}
				</div>
				<div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1 pt-1 border-t border-border/40 w-full">
					<span className="w-4 border-t border-dashed border-white/70 inline-block"></span>{" "}
					perfect sphere reference
				</div>
			</div>

			<div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-card/80 backdrop-blur-md border border-border p-2 rounded-2xl shadow-xl">
				{PRESETS.map((p) => (
					<button
						key={p.id}
						onClick={() => setPreset(p)}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${preset.id === p.id ? "text-white" : "text-muted-foreground hover:text-foreground"}`}
						style={
							preset.id === p.id
								? { backgroundColor: `#${p.hex.toString(16)}` }
								: undefined
						}
					>
						{p.label}
					</button>
				))}
			</div>

			<div
				ref={mountRef}
				className="w-full h-full cursor-grab active:cursor-grabbing"
			/>
		</div>
	);
}
