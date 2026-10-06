import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { disposeThree } from "../disposeThree";
import { observeThreeResize } from "../threeResize";

export default function CorneaKeratoconus() {
	const mountRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!mountRef.current) return;

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
		camera.position.set(2.2, 0.4, 3); // fixed three-quarter side view so the cone is obvious

		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setClearColor(0x000000, 0);
		mountRef.current.appendChild(renderer.domElement);

		const orbit = new OrbitControls(camera, renderer.domElement);
		orbit.enableDamping = true;
		orbit.dampingFactor = 0.05;
		orbit.enableZoom = false;

		const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
		scene.add(ambientLight);
		const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
		dirLight.position.set(5, 5, 5);
		scene.add(dirLight);

		// Fixed, advanced keratoconus. A healthy sphere plus a Gaussian bump
		// pushed below center (inferior), which is where the cone usually forms.
		const rBase = 7.8;
		const severity = 1.0;
		const segments = 96;
		const vertices: number[] = [];
		const indices: number[] = [];
		const colors: number[] = [];
		const col = new THREE.Color();

		for (let i = 0; i <= segments; i++) {
			const rho = (i / segments) * 5.0;
			for (let j = 0; j <= segments; j++) {
				const theta = (j / segments) * Math.PI * 2;
				const x = rho * Math.cos(theta);
				const y = rho * Math.sin(theta);

				let z = Math.sqrt(Math.max(0, rBase * rBase - rho * rho)) - rBase;

				// Gaussian cone, centered 1.5 mm below the apex.
				const dy = y + 1.5;
				const dist = Math.sqrt(x * x + dy * dy);
				const bulge = severity * 1.5 * Math.exp(-(dist * dist) / 2.0);
				z += bulge;

				vertices.push(x * 0.2, y * 0.2, z * 0.2);

				// Color by how far the surface bulges forward: blue (flat) to red (cone).
				const t = THREE.MathUtils.clamp(bulge / 1.2, 0, 1);
				col.setHSL(0.66 * (1 - t), 1.0, 0.5);
				colors.push(col.r, col.g, col.b);
			}
		}

		for (let i = 0; i < segments; i++) {
			for (let j = 0; j < segments; j++) {
				const a = i * (segments + 1) + j;
				const b = a + segments + 1;
				const c = a + 1;
				const d = b + 1;
				indices.push(a, b, c);
				indices.push(c, b, d);
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

		const material = new THREE.MeshPhysicalMaterial({
			vertexColors: true,
			transmission: 0.6,
			opacity: 0.9,
			metalness: 0.1,
			roughness: 0.15,
			ior: 1.376,
			transparent: true,
			side: THREE.DoubleSide,
		});
		const mesh = new THREE.Mesh(geometry, material);

		const wireMesh = new THREE.Mesh(
			geometry,
			new THREE.MeshBasicMaterial({
				color: 0xffffff,
				wireframe: true,
				transparent: true,
				opacity: 0.12,
			}),
		);
		mesh.add(wireMesh);
		scene.add(mesh);

		let animationFrameId: number;
		const animate = () => {
			animationFrameId = requestAnimationFrame(animate);
			orbit.update();
			renderer.render(scene, camera);

			const debugEl = mountRef.current
				?.closest(".interactive-viewer")
				?.querySelector(".debug-output");
			if (debugEl) {
				const state = {
					camera: {
						position: {
							x: Number(camera.position.x.toFixed(3)),
							y: Number(camera.position.y.toFixed(3)),
							z: Number(camera.position.z.toFixed(3)),
						},
						target: {
							x: Number(orbit.target.x.toFixed(3)),
							y: Number(orbit.target.y.toFixed(3)),
							z: Number(orbit.target.z.toFixed(3)),
						},
					},
				};
				(debugEl as HTMLElement).innerText = JSON.stringify(state, null, 2);
			}
		};
		animate();

		const resizeObserver = observeThreeResize(
			mountRef.current,
			renderer,
			camera,
		);

		return () => {
			resizeObserver.disconnect();
			cancelAnimationFrame(animationFrameId);
			if (mountRef.current && renderer.domElement.parentNode) {
				mountRef.current.removeChild(renderer.domElement);
			}
			orbit.dispose();
			disposeThree(scene);
			renderer.dispose();
		};
	}, []);

	return (
		<div className="relative w-full h-[500px] bg-transparent overflow-hidden rounded-lg group">
			<div className="absolute top-4 left-4 z-10 flex flex-col items-start gap-1 pointer-events-none bg-card/80 backdrop-blur-md border border-border p-3 rounded-xl shadow-lg">
				<span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1 border-b border-border/50 pb-1 w-full text-center">
					Keratoconus
				</span>
				<div className="text-[10px] text-muted-foreground max-w-[200px]">
					A thinned cornea bulging forward into a cone, low and off-center. Drag
					to rotate and see the profile.
				</div>
			</div>
			<div className="absolute bottom-4 left-4 z-10 text-[10px] font-bold text-amber-400/80 pointer-events-none">
				↓ Inferior (cone forms here)
			</div>
			<div
				ref={mountRef}
				className="absolute inset-0 cursor-grab active:cursor-grabbing"
			/>
		</div>
	);
}
