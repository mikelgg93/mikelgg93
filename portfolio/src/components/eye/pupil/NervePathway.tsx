import { eyeText } from "../earlyText";
import "./pupil.css";
import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three/examples/jsm/controls/OrbitControls.js";
import { disposeThree } from "../disposeThree";
import { observeVisibility } from "../visibility";

function PathwayScene({ lang = "en" }: { lang?: "en" | "es" }) {
	const t = eyeText(lang);
	const { scene, camera, gl, invalidate, setFrameloop, get } = useThree();
	const uniformsListRef = useRef<
		{
			uTime: { value: number };
			uColor: { value: THREE.Color };
			uOffset: { value: number };
		}[]
	>([]);
	const timing = useRef({
		elapsed: 0,
		resumed: true,
		reduced: false,
		active: false,
	});
	useFrame((_state, dt) => {
		const time = timing.current;
		if (!time.active) return;
		if (!time.reduced && !time.resumed) time.elapsed += Math.min(dt, 0.1);
		time.resumed = false;
		for (const uniforms of uniformsListRef.current)
			uniforms.uTime.value = time.reduced ? 0 : time.elapsed;
	});

	useEffect(() => {
		const group = new THREE.Group();
		scene.add(group);
		const createNode = (pos: THREE.Vector3, color: number, size = 0.15) => {
			const geo = new THREE.SphereGeometry(size, 32, 32);
			const mat = new THREE.MeshBasicMaterial({ color });
			const mesh = new THREE.Mesh(geo, mat);
			mesh.position.copy(pos);

			const glowGeo = new THREE.SphereGeometry(size * 1.5, 32, 32);
			const glowMat = new THREE.MeshBasicMaterial({
				color,
				transparent: true,
				opacity: 0.25,
				blending: THREE.AdditiveBlending,
				depthWrite: false,
			});
			const glowMesh = new THREE.Mesh(glowGeo, glowMat);
			mesh.add(glowMesh);

			group.add(mesh);
			return mesh;
		};

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
			uniformsListRef.current.push(uniforms);

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
						float pulse = fract(vUv.x * 3.0 - uTime * 2.0 + uOffset);
						float intensity = smoothstep(0.8, 1.0, pulse) * 2.0 + 0.3;
						gl_FragColor = vec4(uColor * intensity, 0.7);
					}
				`,
			});
			const mesh = new THREE.Mesh(geo, mat);
			group.add(mesh);
			return mesh;
		};

		const eyeL = new THREE.Vector3(-2, 0, 4);
		const eyeR = new THREE.Vector3(2, 0, 4);
		const chiasm = new THREE.Vector3(0, 0, 2);

		const pretectalL = new THREE.Vector3(-0.8, 0, 0);
		const pretectalR = new THREE.Vector3(0.8, 0, 0);

		const ewL = new THREE.Vector3(-0.4, 0.3, -0.4);
		const ewR = new THREE.Vector3(0.4, 0.3, -0.4);

		const ganglionL = new THREE.Vector3(-2, -0.3, 3);
		const ganglionR = new THREE.Vector3(2, -0.3, 3);

		const colSensory = 0x3b82f6;
		const colInter = 0xa855f7;
		const colMotor = 0x10b981;
		const colNode = 0xf8fafc;

		createNode(eyeL, colNode, 0.3);
		createNode(eyeR, colNode, 0.3);
		createNode(pretectalL, colNode);
		createNode(pretectalR, colNode);
		createNode(ewL, colNode);
		createNode(ewR, colNode);
		createNode(ganglionL, colNode);
		createNode(ganglionR, colNode);

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

		const pcL = new THREE.Vector3(-0.2, 0.2, -0.1);
		const pcR = new THREE.Vector3(0.2, 0.2, -0.1);

		createTract(
			[pretectalL, new THREE.Vector3(-0.6, 0.15, -0.2), ewL],
			colInter,
			0.04,
			-0.3,
		);
		createTract([pretectalL, pcL, pcR, ewR], colInter, 0.04, -0.3);
		createTract(
			[pretectalR, new THREE.Vector3(0.6, 0.15, -0.2), ewR],
			colInter,
			0.04,
			-0.3,
		);
		createTract([pretectalR, pcR, pcL, ewL], colInter, 0.04, -0.3);

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

		createTract([ganglionL, eyeL], colMotor, 0.04, -0.8);
		createTract([ganglionR, eyeR], colMotor, 0.04, -0.8);

		const viewer = gl.domElement.closest(".interactive-viewer");
		const motion = matchMedia("(prefers-reduced-motion: reduce)");
		const updateLoop = () => {
			timing.current.reduced = motion.matches;
			timing.current.resumed = true;
			const controls = get().controls as OrbitControlsImpl | null;
			if (controls) controls.enableDamping = !motion.matches;
			setFrameloop(
				!timing.current.active ? "never" : motion.matches ? "demand" : "always",
			);
			if (timing.current.active) invalidate();
		};
		const stopVisibility = observeVisibility(gl.domElement, (active) => {
			timing.current.active = active;
			updateLoop();
		});
		const inspect = () => {
			const output = viewer?.querySelector(".debug-output");
			if (output)
				output.textContent = JSON.stringify(
					{
						model: "Schematic pupillary light reflex pathway",
						afferent:
							"Retina → optic nerve/chiasm/tract → olivary pretectal nuclei",
						efferent:
							"Edinger–Westphal (preganglionic) → CN III → ciliary ganglion → short ciliary nerves → sphincter",
						bilateralProjection: true,
						pulseSpeed: "Illustrative; not measured neural conduction",
						camera: camera.position.toArray(),
					},
					null,
					2,
				);
		};
		const reset = () => {
			timing.current.elapsed = 0;
			timing.current.resumed = true;
			const controls = get().controls as OrbitControlsImpl | null;
			if (controls) {
				const damping = controls.enableDamping;
				controls.enableDamping = false;
				controls.update();
				camera.position.set(0, 8, 10);
				controls.target.set(0, 0, 1.5);
				controls.update();
				controls.enableDamping = damping;
			}
			invalidate();
			inspect();
		};
		viewer?.addEventListener("eye:inspect", inspect);
		viewer?.addEventListener("eye:reset", reset);
		viewer?.addEventListener("eye:reset-camera", reset);
		motion.addEventListener("change", updateLoop);
		inspect();
		return () => {
			stopVisibility();
			viewer?.removeEventListener("eye:inspect", inspect);
			viewer?.removeEventListener("eye:reset", reset);
			viewer?.removeEventListener("eye:reset-camera", reset);
			motion.removeEventListener("change", updateLoop);
			scene.remove(group);
			disposeThree(group);
			uniformsListRef.current = [];
		};
	}, [scene, camera, gl, invalidate, setFrameloop, get]);

	return (
		<>
			<Html position={[-2, 0.4, 4]} center zIndexRange={[100, 0]}>
				<div className="text-[10px] font-bold tracking-widest uppercase text-white bg-black/60 px-2 py-1 rounded border border-white/20 backdrop-blur-sm whitespace-nowrap pointer-events-none">
					<span className="md:hidden">1</span>
					<span className="hidden md:inline">Retina</span>
				</div>
			</Html>
			<Html position={[0, 0.4, 2]} center zIndexRange={[100, 0]}>
				<div className="text-[10px] font-bold tracking-widest uppercase text-white bg-black/60 px-2 py-1 rounded border border-white/20 backdrop-blur-sm whitespace-nowrap pointer-events-none">
					<span className="md:hidden">2</span>
					<span className="hidden md:inline">{t("Optic Chiasm")}</span>
				</div>
			</Html>
			<Html position={[-0.8, 0.3, 0]} center zIndexRange={[100, 0]}>
				<div className="text-[10px] font-bold tracking-widest uppercase text-white bg-black/60 px-2 py-1 rounded border border-white/20 backdrop-blur-sm whitespace-nowrap pointer-events-none">
					<span className="md:hidden">3</span>
					<span className="hidden md:inline">
						{t("Olivary Pretectal Nucleus")}
					</span>
				</div>
			</Html>
			<Html position={[-0.4, 0.6, -0.4]} center zIndexRange={[100, 0]}>
				<div className="text-[10px] font-bold tracking-widest uppercase text-white bg-black/60 px-2 py-1 rounded border border-white/20 backdrop-blur-sm whitespace-nowrap pointer-events-none">
					<span className="md:hidden">4</span>
					<span className="hidden md:inline">
						{t("Edinger-Westphal Nucleus")}
					</span>
				</div>
			</Html>
			<Html position={[-2.3, -0.3, 3]} center zIndexRange={[100, 0]}>
				<div className="text-[10px] font-bold tracking-widest uppercase text-white bg-black/60 px-2 py-1 rounded border border-white/20 backdrop-blur-sm whitespace-nowrap pointer-events-none">
					<span className="md:hidden">5</span>
					<span className="hidden md:inline">{t("Ciliary Ganglion")}</span>
				</div>
			</Html>
		</>
	);
}

export default function NervePathway({ lang = "en" }: { lang?: "en" | "es" }) {
	const t = eyeText(lang);
	return (
		<div className="pupil-demo relative w-full h-[400px] bg-transparent overflow-hidden rounded-lg">
			<div className="pupil-metrics absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
				<div className="flex items-center gap-2">
					<div className="w-3 h-3 rounded-full bg-blue-500"></div>
					<span className="text-xs text-muted-foreground font-medium">
						{t("Sensory (Optic Nerve)")}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-3 h-3 rounded-full bg-purple-500"></div>
					<span className="text-xs text-muted-foreground font-medium">
						{t("Interneurons")}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-3 h-3 rounded-full bg-emerald-500"></div>
					<span className="text-xs text-muted-foreground font-medium">
						{t("Motor (CN III → ganglion → short ciliary nerves)")}
					</span>
				</div>
			</div>

			<div className="pupil-scene w-full h-full cursor-grab active:cursor-grabbing">
				<Canvas
					frameloop="demand"
					dpr={[1, 2]}
					className="pupil-canvas"
					camera={{ position: [0, 8, 10], fov: 35 }}
				>
					<PathwayScene lang={lang} />
					<OrbitControls
						makeDefault
						enableDamping
						dampingFactor={0.05}
						target={[0, 0, 1.5]}
					/>
				</Canvas>
			</div>
			<ol
				className="pupil-controls grid grid-cols-2 gap-2 list-none p-0 text-xs text-muted-foreground md:hidden"
				aria-label={t("Pathway labels")}
			>
				<li>1. Retina</li>
				<li>{t("2. Optic Chiasm")}</li>
				<li>{t("3. Olivary Pretectal Nucleus")}</li>
				<li>{t("4. Edinger-Westphal Nucleus")}</li>
				<li>{t("5. Ciliary Ganglion")}</li>
			</ol>
		</div>
	);
}
