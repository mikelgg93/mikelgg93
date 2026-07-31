import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { observeThreeResize } from "../threeResize";

// One shared shape drives both the 3D topography and the 2D ring reflection,
// so the rings crowd together exactly where the 3D surface steepens.
// Mild astigmatism (steeper along Y) plus an inferior cone.
const CY = 1 / 6.6; // steep meridian curvature (1/mm)
const CX = 1 / 7.8; // flat meridian curvature (1/mm)
const CONE_X = 1.0;
const CONE_Y = -1.5; // inferior
const CONE_R = 2.2;

// Local corneal power (relative units) at a point, blending the astigmatic
// base with the cone. Higher = steeper.
function localPower(x: number, y: number) {
	const r2 = x * x + y * y || 1;
	const base = (CX * (x * x)) / r2 + (CY * (y * y)) / r2;
	const dx = x - CONE_X;
	const dy = y - CONE_Y;
	const dist = Math.sqrt(dx * dx + dy * dy);
	const cone =
		dist < CONE_R ? Math.cos(((dist / CONE_R) * Math.PI) / 2) ** 2 * 0.06 : 0;
	return base + cone;
}

function surfaceZ(x: number, y: number) {
	const k = -0.26;
	const denom =
		1 +
		Math.sqrt(Math.max(0, 1 - (1 + k) * (CX * CX * x * x + CY * CY * y * y)));
	let z = (CX * x * x + CY * y * y) / denom;
	const dx = x - CONE_X;
	const dy = y - CONE_Y;
	const dist = Math.sqrt(dx * dx + dy * dy);
	if (dist < CONE_R) z -= Math.cos(((dist / CONE_R) * Math.PI) / 2) ** 2 * 0.6;
	return z;
}

// A Placido disc reflects like a convex mirror: steeper cornea pulls the
// reflected ring inward. We scale each ring radius by (reference / local power).
function drawPlacido(canvas: HTMLCanvasElement) {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;
	const S = 130;
	const cxp = S / 2;
	const refPower = (CX + CY) / 2;

	ctx.clearRect(0, 0, S, S);
	ctx.strokeStyle = "#ffffff";

	for (let ring = 1; ring <= 9; ring++) {
		const baseR = (ring / 9) * (S / 2 - 6);
		const rhoMm = (ring / 9) * 4.5; // mm on the cornea this ring reflects from
		ctx.beginPath();
		for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.05) {
			const x = rhoMm * Math.cos(a);
			const y = rhoMm * Math.sin(a);
			const scale = THREE.MathUtils.clamp(
				refPower / localPower(x, y),
				0.6,
				1.4,
			);
			// Canvas Y grows downward, so negate it to keep the reflex oriented the
			// same way as the 3D map (inferior cone crowds at the bottom).
			const px = cxp + Math.cos(a) * baseR * scale;
			const py = cxp - Math.sin(a) * baseR * scale;
			if (a === 0) ctx.moveTo(px, py);
			else ctx.lineTo(px, py);
		}
		ctx.closePath();
		ctx.lineWidth = ring > 5 ? 0.9 : 1.3;
		ctx.stroke();
	}
}

function buildCornea() {
	const maxR = 5.0;
	const radial = 80;
	const angular = 80;
	const v: number[] = [];
	const colors: number[] = [];
	const indices: number[] = [];
	const col = new THREE.Color();
	const refPower = (CX + CY) / 2;

	for (let i = 0; i <= radial; i++) {
		const r = (i / radial) * maxR;
		for (let j = 0; j <= angular; j++) {
			const theta = (j / angular) * Math.PI * 2;
			const x = r * Math.cos(theta);
			const y = r * Math.sin(theta);
			v.push(x, y, surfaceZ(x, y));

			const t = THREE.MathUtils.clamp(
				(localPower(x, y) - refPower) / 0.05 + 0.3,
				0,
				1,
			);
			col.setHSL(0.66 * (1 - t), 1.0, 0.5);
			colors.push(col.r, col.g, col.b);
		}
	}

	for (let i = 0; i < radial; i++) {
		for (let j = 0; j < angular; j++) {
			const a = i * (angular + 1) + j;
			const b = a + 1;
			const c = (i + 1) * (angular + 1) + j;
			const d = c + 1;
			indices.push(a, b, d);
			indices.push(a, d, c);
		}
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
	geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
	geometry.setIndex(indices);
	geometry.computeVertexNormals();
	return geometry;
}

export default function CorneaPlacido() {
	const mountRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		if (!mountRef.current) return;

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
		camera.position.set(-16, 0, 0.2); // looking straight down the optical axis

		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setClearColor(0x000000, 0);
		mountRef.current.appendChild(renderer.domElement);

		const orbit = new OrbitControls(camera, renderer.domElement);
		orbit.enableDamping = true;
		orbit.dampingFactor = 0.05;
		orbit.target.set(0, 0, 0);

		scene.add(new THREE.AmbientLight(0xffffff, 1.0));
		const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
		dirLight.position.set(10, 10, 10);
		scene.add(dirLight);

		const geometry = buildCornea();
		const corneaMat = new THREE.MeshPhysicalMaterial({
			vertexColors: true,
			transmission: 0.1,
			metalness: 0.1,
			roughness: 0.4,
			ior: 1.376,
			thickness: 1.0,
			side: THREE.DoubleSide,
		});
		const corneaMesh = new THREE.Mesh(geometry, corneaMat);
		corneaMesh.rotation.y = Math.PI / 2; // apex toward -X
		scene.add(corneaMesh);

		const wireMat = new THREE.LineBasicMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 0.12,
		});
		corneaMesh.add(
			new THREE.LineSegments(new THREE.WireframeGeometry(geometry), wireMat),
		);

		if (canvasRef.current) drawPlacido(canvasRef.current);

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
					},
					target: {
						x: Number(orbit.target.x.toFixed(3)),
						y: Number(orbit.target.y.toFixed(3)),
						z: Number(orbit.target.z.toFixed(3)),
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
			renderer.dispose();
			geometry.dispose();
			corneaMat.dispose();
			wireMat.dispose();
		};
	}, []);

	return (
		<div className="relative w-full h-[500px] md:h-[600px] bg-transparent overflow-hidden rounded-lg group">
			<div className="absolute top-4 left-4 z-10 flex flex-col items-start gap-1 pointer-events-none bg-card/80 backdrop-blur-md border border-border p-3 rounded-xl shadow-lg">
				<span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1 border-b border-border/50 pb-1 w-full text-center">
					Topography
				</span>
				<div className="flex items-center gap-2 text-xs font-bold text-foreground">
					<span
						className="w-3 h-3 rounded-full border-2 border-foreground"
						style={{ background: "linear-gradient(to right, blue, red)" }}
					></span>{" "}
					Steeper = redder
				</div>
				<div className="text-[10px] text-muted-foreground max-w-[200px] mt-1">
					The rings on the right reflect off this same surface. They crowd
					together where the cornea steepens (red), just like a real
					topographer.
				</div>
			</div>

			<div className="absolute top-4 right-4 z-20 flex flex-col items-center bg-card/80 backdrop-blur-md border border-border p-3 rounded-xl shadow-lg pointer-events-none">
				<span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground border-b border-border/50 pb-1 w-full text-center mb-2">
					Placido Reflex
				</span>
				<div className="relative bg-black rounded-full overflow-hidden border border-border/50 shadow-inner w-[130px] h-[130px]">
					<canvas
						ref={canvasRef}
						width="130"
						height="130"
						className="w-[130px] h-[130px] rounded-full block"
					/>
				</div>
			</div>

			<div
				ref={mountRef}
				className="absolute inset-0 cursor-grab active:cursor-grabbing"
			/>
		</div>
	);
}
