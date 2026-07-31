import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { observeThreeResize } from "../threeResize";

export default function CorneaStep1() {
	const mountRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!mountRef.current) return;

		// Scene setup
		const scene = new THREE.Scene();
		// Camera setup
		const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
		camera.position.set(-0.176, -0.038, 2.126);
		camera.zoom = 1;

		// Renderer setup
		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setClearColor(0x000000, 0); // Transparent background
		mountRef.current.appendChild(renderer.domElement);

		// Controls setup
		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;
		controls.target.set(-0.734, 0.003, -0.081);

		const resizeObserver = observeThreeResize(
			mountRef.current,
			renderer,
			camera,
		);

		// Lighting
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
		scene.add(ambientLight);

		const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
		dirLight.position.set(5, 5, 5);
		scene.add(dirLight);

		// Geometry: Simple Sphere (Javal's early approximation)
		// Radius of curvature ~7.8mm. Let's scale it down for our scene.
		const radius = 1;
		const widthSegments = 64;
		const heightSegments = 64;

		// We only want a cap. Phi starts at 0 (top), goes down.
		// A cornea is roughly the anterior 1/6th of the eye.
		const phiStart = 0;
		const phiLength = Math.PI / 4;

		const geometry = new THREE.SphereGeometry(
			radius,
			widthSegments,
			heightSegments,
			0,
			Math.PI * 2,
			phiStart,
			phiLength,
		);

		// Material matching WebGLEye "vibe"
		const material = new THREE.MeshStandardMaterial({
			color: 0x52525b,
			roughness: 0.9,
			transparent: true,
			opacity: 0.6,
			depthWrite: false,
			side: THREE.DoubleSide,
		});

		const mesh = new THREE.Mesh(geometry, material);

		// Add wireframe layer for the high-quality tech vibe
		const wireMaterial = new THREE.MeshBasicMaterial({
			color: 0xa1a1aa,
			wireframe: true,
			transparent: true,
			opacity: 0.4,
		});
		const wireMesh = new THREE.Mesh(geometry, wireMaterial);
		mesh.add(wireMesh);

		// Rotate so the apex (+Y of sphere) points left (-X)
		mesh.rotation.z = Math.PI / 2;

		scene.add(mesh);

		// Animation Loop
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
							x: Number(camera.position.x.toFixed(3)),
							y: Number(camera.position.y.toFixed(3)),
							z: Number(camera.position.z.toFixed(3)),
						},
						rotation: {
							x: Number(camera.rotation.x.toFixed(3)),
							y: Number(camera.rotation.y.toFixed(3)),
							z: Number(camera.rotation.z.toFixed(3)),
						},
						zoom: Number(camera.zoom.toFixed(3)),
					},
					target: {
						x: Number(controls.target.x.toFixed(3)),
						y: Number(controls.target.y.toFixed(3)),
						z: Number(controls.target.z.toFixed(3)),
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
		<div className="relative w-full h-full">
			<div
				ref={mountRef}
				className="w-full h-full min-h-[400px]"
				style={{ cursor: "grab" }}
			/>
		</div>
	);
}
