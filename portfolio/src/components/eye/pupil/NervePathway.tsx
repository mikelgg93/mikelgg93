import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { observeThreeResize } from "../threeResize";

export default function NervePathway() {
	const mountRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!mountRef.current) return;

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
		camera.position.set(0, 8, 10);

		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setClearColor(0x000000, 0);
		mountRef.current.appendChild(renderer.domElement);

		const orbit = new OrbitControls(camera, renderer.domElement);
		orbit.enableDamping = true;
		orbit.dampingFactor = 0.05;
		orbit.target.set(0, 0, 1.5);

		// Helper to create glowing nodes
		const createNode = (pos: THREE.Vector3, color: number, size = 0.15) => {
			const geo = new THREE.SphereGeometry(size, 32, 32);
			const mat = new THREE.MeshBasicMaterial({ color });
			const mesh = new THREE.Mesh(geo, mat);
			mesh.position.copy(pos);
			scene.add(mesh);
			return mesh;
		};

		// Helper to create glowing nerve tracts (tubes) with animated pulses
		const uniformsList: any[] = [];
		const createTract = (
			points: THREE.Vector3[],
			color: number,
			thickness = 0.04,
			pulseOffset = 0,
		) => {
			const curve = new THREE.CatmullRomCurve3(points);
			const geo = new THREE.TubeGeometry(curve, 64, thickness, 8, false);
			const uniforms = {
				uTime: { value: 0 },
				uColor: { value: new THREE.Color(color) },
				uOffset: { value: pulseOffset },
			};
			uniformsList.push(uniforms);

			const mat = new THREE.ShaderMaterial({
				uniforms,
				transparent: true,
				vertexShader: `
					varying vec2 vUv;
					void main() {
						vUv = uv;
						gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
					}
				`,
				fragmentShader: `
					uniform float uTime;
					uniform vec3 uColor;
					uniform float uOffset;
					varying vec2 vUv;
					void main() {
						// vUv.x goes from 0 to 1 along the tube
						float pulse = fract(vUv.x * 3.0 - uTime * 2.0 + uOffset);
						float intensity = smoothstep(0.8, 1.0, pulse) * 2.0 + 0.3;
						gl_FragColor = vec4(uColor * intensity, 0.7);
					}
				`,
			});
			const mesh = new THREE.Mesh(geo, mat);
			scene.add(mesh);
			return mesh;
		};

		// Define anatomical positions (stylized)
		const eyeL = new THREE.Vector3(-2, 0, 4);
		const eyeR = new THREE.Vector3(2, 0, 4);
		const chiasm = new THREE.Vector3(0, 0, 2);

		const pretectalL = new THREE.Vector3(-0.8, 0, 0);
		const pretectalR = new THREE.Vector3(0.8, 0, 0);

		const ewL = new THREE.Vector3(-0.4, 0.3, -0.4);
		const ewR = new THREE.Vector3(0.4, 0.3, -0.4);

		const ganglionL = new THREE.Vector3(-2, -0.3, 3);
		const ganglionR = new THREE.Vector3(2, -0.3, 3);

		// Colors
		const colSensory = 0x3b82f6; // Blue (afferent from retina)
		const colInter = 0xa855f7; // Purple (interneurons)
		const colMotor = 0x10b981; // Emerald (efferent to iris)
		const colNode = 0xf8fafc; // White

		// Nodes
		createNode(eyeL, colNode, 0.3);
		createNode(eyeR, colNode, 0.3);
		createNode(pretectalL, colNode);
		createNode(pretectalR, colNode);
		createNode(ewL, colNode);
		createNode(ewR, colNode);
		createNode(ganglionL, colNode);
		createNode(ganglionR, colNode);

		// Optic Nerves -> Optic Tracts -> Pretectal Nucleus
		createTract(
			[
				eyeL,
				new THREE.Vector3(-0.5, 0, 2.5),
				chiasm,
				new THREE.Vector3(0.4, 0, 1),
				pretectalR,
			],
			colSensory,
			0.04,
			0.0,
		);
		createTract(
			[
				eyeL,
				new THREE.Vector3(-1.5, 0, 3),
				new THREE.Vector3(-0.8, 0, 1.5),
				pretectalL,
			],
			colSensory,
			0.04,
			0.0,
		);
		createTract(
			[
				eyeR,
				new THREE.Vector3(0.5, 0, 2.5),
				chiasm,
				new THREE.Vector3(-0.4, 0, 1),
				pretectalL,
			],
			colSensory,
			0.04,
			0.0,
		);
		createTract(
			[
				eyeR,
				new THREE.Vector3(1.5, 0, 3),
				new THREE.Vector3(0.8, 0, 1.5),
				pretectalR,
			],
			colSensory,
			0.04,
			0.0,
		);

		// Interneurons: Pretectal to Edinger-Westphal
		const pcL = new THREE.Vector3(-0.2, 0.2, -0.1);
		const pcR = new THREE.Vector3(0.2, 0.2, -0.1);

		createTract(
			[pretectalL, new THREE.Vector3(-0.6, 0.15, -0.2), ewL],
			colInter,
			0.04,
			-0.3,
		);
		createTract(
			[pretectalL, pcL, pcR, ewR],
			colInter,
			0.04,
			-0.3,
		);
		createTract(
			[pretectalR, new THREE.Vector3(0.6, 0.15, -0.2), ewR],
			colInter,
			0.04,
			-0.3,
		);
		createTract(
			[pretectalR, pcR, pcL, ewL],
			colInter,
			0.04,
			-0.3,
		);

		// Motor: Edinger-Westphal to Ciliary Ganglion
		createTract(
			[ewL, new THREE.Vector3(-1.0, 0, 1.5), ganglionL],
			colMotor,
			0.04,
			-0.6,
		);
		createTract(
			[ewR, new THREE.Vector3(1.0, 0, 1.5), ganglionR],
			colMotor,
			0.04,
			-0.6,
		);

		// Motor: Ciliary Ganglion to Iris Sphincter
		createTract([ganglionL, eyeL], colMotor, 0.04, -0.8);
		createTract([ganglionR, eyeR], colMotor, 0.04, -0.8);

		// Simple animation loop for glowing pulses (moving along tracts)
		const _clock = new THREE.Clock();
		let raf = 0;
		const resizeObserver = observeThreeResize(
			mountRef.current,
			renderer,
			camera,
		);

		const animate = () => {
			raf = requestAnimationFrame(animate);
			const t = _clock.getElapsedTime();
			for (const u of uniformsList) {
				u.uTime.value = t;
			}
			orbit.update();
			renderer.render(scene, camera);
		};
		animate();

		return () => {
			cancelAnimationFrame(raf);
			resizeObserver.disconnect();
			renderer.dispose();
			// Cleanup geos/mats omitted for brevity in this scratch file
		};
	}, []);

	return (
		<div className="relative w-full h-[400px] bg-transparent overflow-hidden rounded-lg">
			<div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
				<div className="flex items-center gap-2">
					<div className="w-3 h-3 rounded-full bg-blue-500"></div>
					<span className="text-xs text-slate-300 font-medium">
						Sensory (Optic Nerve)
					</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-3 h-3 rounded-full bg-purple-500"></div>
					<span className="text-xs text-slate-300 font-medium">
						Interneurons
					</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-3 h-3 rounded-full bg-emerald-500"></div>
					<span className="text-xs text-slate-300 font-medium">
						Motor (CN III to Iris)
					</span>
				</div>
			</div>
			<div
				ref={mountRef}
				className="w-full h-full cursor-grab active:cursor-grabbing"
			/>
		</div>
	);
}
