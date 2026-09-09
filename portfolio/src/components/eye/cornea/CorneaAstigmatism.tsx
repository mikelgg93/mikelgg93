import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { observeThreeResize } from "../threeResize";

export default function CorneaAstigmatism() {
	const mountRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!mountRef.current) return;

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
		camera.position.set(14.87, 6.151, -2.13);

		scene.add(new THREE.AmbientLight(0xffffff, 0.6));
		const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
		dirLight.position.set(5, 10, 7);
		scene.add(dirLight);

		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setClearColor(0x000000, 0);
		mountRef.current.appendChild(renderer.domElement);

		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;
		controls.target.set(1.008, 2.253, -0.219);

		const resizeObserver = observeThreeResize(
			mountRef.current,
			renderer,
			camera,
		);

		// Toric ("football") surface: flat radius on X, steep radius on Y.
		const Rx = 7.8;
		const Ry = 6.0;
		const cx = 1 / Rx;
		const cy = 1 / Ry;
		const k = -0.26;
		const maxR = 5.0;
		const radialSegments = 64;
		const angularSegments = 96;

		const vertices: number[] = [];
		const colors: number[] = [];
		const indices: number[] = [];
		const color = new THREE.Color();

		const minC = Math.min(cx, cy);
		const maxC = Math.max(cx, cy);

		for (let i = 0; i <= radialSegments; i++) {
			const r = (i / radialSegments) * maxR;
			for (let j = 0; j <= angularSegments; j++) {
				const theta = (j / angularSegments) * Math.PI * 2;
				const x = r * Math.cos(theta);
				const y = r * Math.sin(theta);

				let z = 0;
				if (r > 0) {
					const root = 1 - (1 + k) * (cx * cx * x * x + cy * cy * y * y);
					z =
						root >= 0
							? (cx * x * x + cy * y * y) / (1 + Math.sqrt(root))
							: vertices[vertices.length - 3] || 0;
				}
				vertices.push(x, y, z);

				// True meridional curvature at this azimuth (Euler): blue = flat, red = steep.
				const localC = cx * Math.cos(theta) ** 2 + cy * Math.sin(theta) ** 2;
				const t = (localC - minC) / (maxC - minC);
				color.setHSL(0.66 * (1 - t), 0.95, 0.5);
				colors.push(color.r, color.g, color.b);
			}
		}

		for (let i = 0; i < radialSegments; i++) {
			for (let j = 0; j < angularSegments; j++) {
				const a = i * (angularSegments + 1) + j;
				const b = a + 1;
				const c = (i + 1) * (angularSegments + 1) + j;
				const d = c + 1;
				indices.push(a, b, d);
				indices.push(a, d, c);
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

		const material = new THREE.MeshStandardMaterial({
			vertexColors: true,
			roughness: 0.2,
			metalness: 0.1,
			transparent: true,
			opacity: 0.55,
			depthWrite: false,
			side: THREE.DoubleSide,
		});
		const mesh = new THREE.Mesh(geometry, material);
		mesh.rotation.x = -Math.PI / 2;
		scene.add(mesh);

		mesh.add(
			new THREE.Mesh(
				geometry,
				new THREE.MeshBasicMaterial({
					color: 0xffffff,
					wireframe: true,
					transparent: true,
					opacity: 0.1,
				}),
			),
		);

		// XYZ axes (R = x, G = y, B = z), the notation from the original view.
		mesh.add(new THREE.AxesHelper(6.5));

		let animationFrameId: number;
		const animate = () => {
			animationFrameId = requestAnimationFrame(animate);
			mesh.rotation.z += 0.004; // gentle spin so the oval reads clearly
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
			geometry.dispose();
			material.dispose();
		};
	}, []);

	return (
		<div className="relative w-full h-[450px] md:h-[550px] flex flex-col items-center overflow-hidden rounded-lg group bg-transparent">
			<div className="absolute top-4 left-4 z-10 flex flex-col items-start gap-1 pointer-events-none bg-card/80 backdrop-blur-md border border-border p-3 rounded-xl shadow-lg text-xs">
				<span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground border-b border-border/50 pb-1 w-full text-center mb-1">
					Toric Cornea
				</span>
				<div className="flex items-center gap-2">
					<span className="w-3 h-0.5 bg-red-500 inline-block"></span> X axis:
					flat meridian (Rx = 7.8 mm)
				</div>
				<div className="flex items-center gap-2">
					<span className="w-3 h-0.5 bg-green-500 inline-block"></span> Y axis:
					steep meridian (Ry = 6.0 mm)
				</div>
				<div className="flex items-center gap-2">
					<span className="w-3 h-0.5 bg-blue-500 inline-block"></span> Z axis:
					surface height
				</div>
			</div>
			<div className="absolute top-4 right-4 z-10 flex flex-col items-center gap-2 pointer-events-none bg-card/60 backdrop-blur-md border border-border p-3 rounded-xl shadow-lg">
				<span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground border-b border-border/50 pb-1 w-full text-center">
					Curvature
				</span>
				<span className="text-[10px] font-bold text-red-500/70 mt-1">
					Steep
				</span>
				<div className="w-4 h-24 rounded-full bg-gradient-to-b from-red-500 via-green-500 to-blue-500 shadow-inner ring-1 ring-white/10"></div>
				<span className="text-[10px] font-bold text-blue-500/70 mb-1">
					Flat
				</span>
			</div>
			<div
				ref={mountRef}
				className="w-full h-full cursor-grab active:cursor-grabbing"
			/>
		</div>
	);
}
