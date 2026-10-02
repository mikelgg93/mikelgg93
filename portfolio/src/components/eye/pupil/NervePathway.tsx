import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";

function PathwayScene() {
	const { scene } = useThree();
	const uniformsListRef = useRef<any[]>([]);

	useEffect(() => {
		const createNode = (pos: THREE.Vector3, color: number, size = 0.15) => {
			const geo = new THREE.SphereGeometry(size, 32, 32);
			const mat = new THREE.MeshBasicMaterial({ color });
			const mesh = new THREE.Mesh(geo, mat);
			mesh.position.copy(pos);
			scene.add(mesh);
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
			scene.add(mesh);
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

		createTract([eyeL, new THREE.Vector3(-0.5, 0, 2.5), chiasm, new THREE.Vector3(0.4, 0, 1), pretectalR], colSensory, 0.04, 0.0);
		createTract([eyeL, new THREE.Vector3(-1.5, 0, 3), new THREE.Vector3(-0.8, 0, 1.5), pretectalL], colSensory, 0.04, 0.0);
		createTract([eyeR, new THREE.Vector3(0.5, 0, 2.5), chiasm, new THREE.Vector3(-0.4, 0, 1), pretectalL], colSensory, 0.04, 0.0);
		createTract([eyeR, new THREE.Vector3(1.5, 0, 3), new THREE.Vector3(0.8, 0, 1.5), pretectalR], colSensory, 0.04, 0.0);

		const pcL = new THREE.Vector3(-0.2, 0.2, -0.1);
		const pcR = new THREE.Vector3(0.2, 0.2, -0.1);

		createTract([pretectalL, new THREE.Vector3(-0.6, 0.15, -0.2), ewL], colInter, 0.04, -0.3);
		createTract([pretectalL, pcL, pcR, ewR], colInter, 0.04, -0.3);
		createTract([pretectalR, new THREE.Vector3(0.6, 0.15, -0.2), ewR], colInter, 0.04, -0.3);
		createTract([pretectalR, pcR, pcL, ewL], colInter, 0.04, -0.3);

		createTract([ewL, new THREE.Vector3(-1.0, 0, 1.5), ganglionL], colMotor, 0.04, -0.6);
		createTract([ewR, new THREE.Vector3(1.0, 0, 1.5), ganglionR], colMotor, 0.04, -0.6);

		createTract([ganglionL, eyeL], colMotor, 0.04, -0.8);
		createTract([ganglionR, eyeR], colMotor, 0.04, -0.8);

		return () => {
			uniformsListRef.current = [];
		};
	}, [scene]);

	useFrame(({ clock }) => {
		const t = clock.getElapsedTime();
		for (const u of uniformsListRef.current) {
			u.uTime.value = t;
		}
	});

	return (
		<>
			<Html position={[-2, 0.4, 4]} center zIndexRange={[100, 0]}>
				<div className="text-[10px] font-bold tracking-widest uppercase text-white bg-black/60 px-2 py-1 rounded border border-white/20 backdrop-blur-sm whitespace-nowrap pointer-events-none">
					Retina
				</div>
			</Html>
			<Html position={[-0.8, 0.3, 0]} center zIndexRange={[100, 0]}>
				<div className="text-[10px] font-bold tracking-widest uppercase text-white bg-black/60 px-2 py-1 rounded border border-white/20 backdrop-blur-sm whitespace-nowrap pointer-events-none">
					Pretectal Nucleus
				</div>
			</Html>
			<Html position={[-0.4, 0.6, -0.4]} center zIndexRange={[100, 0]}>
				<div className="text-[10px] font-bold tracking-widest uppercase text-white bg-black/60 px-2 py-1 rounded border border-white/20 backdrop-blur-sm whitespace-nowrap pointer-events-none">
					Edinger-Westphal Nucleus
				</div>
			</Html>
			<Html position={[-2.3, -0.3, 3]} center zIndexRange={[100, 0]}>
				<div className="text-[10px] font-bold tracking-widest uppercase text-white bg-black/60 px-2 py-1 rounded border border-white/20 backdrop-blur-sm whitespace-nowrap pointer-events-none">
					Ciliary Ganglion
				</div>
			</Html>
		</>
	);
}

export default function NervePathway() {
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
			
			<div className="w-full h-full cursor-grab active:cursor-grabbing">
				<Canvas camera={{ position: [0, 8, 10], fov: 35 }}>
					<PathwayScene />
					<OrbitControls enableDamping dampingFactor={0.05} target={[0, 0, 1.5]} />
				</Canvas>
			</div>
		</div>
	);
}
