import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ErrorBoundary } from "../ErrorBoundary";
import { observeThreeResize } from "../threeResize";

function CorneaMasterInner() {
	const mountRef = useRef<HTMLDivElement>(null);

	// State for interactive sliders
	const [k1, setK1] = useState(7.8);
	const [k2, setK2] = useState(7.8);
	const [asphericity, setAsphericity] = useState(-0.26);
	const [thickness, setThickness] = useState(0.55);

	const sceneRef = useRef<THREE.Scene | null>(null);
	const geoRef = useRef<{
		mesh: THREE.Mesh;
		postMesh: THREE.Mesh;
		wire: THREE.Mesh;
		postWire: THREE.Mesh;
		rays: THREE.Group;
	} | null>(null);

	useEffect(() => {
		if (!mountRef.current) return;

		const scene = new THREE.Scene();
		sceneRef.current = scene;
		const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
		// Move camera to view the entire ray tracing from left (-X) to right (+X)
		camera.position.set(5.374, 18.032, 29.638);
		camera.zoom = 1;

		const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
		scene.add(ambientLight);
		const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
		dirLight.position.set(10, 15, 20);
		scene.add(dirLight);

		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setClearColor(0x000000, 0);
		mountRef.current.appendChild(renderer.domElement);

		const orbit = new OrbitControls(camera, renderer.domElement);
		orbit.enableDamping = true;
		orbit.dampingFactor = 0.05;
		orbit.target.set(10, 0, 0);

		// Handle responsive resize
		const resizeObserver = observeThreeResize(
			mountRef.current,
			renderer,
			camera,
		);

		const group = new THREE.Group();
		scene.add(group);

		// Provide a dummy geometry with valid attributes so WireframeGeometry doesn't crash on mount
		const geometry = new THREE.SphereGeometry(5, 32, 32);
		// Create Anterior Mesh
		const meshMat = new THREE.MeshPhysicalMaterial({
			color: 0xffffff,
			transmission: 0.9,
			opacity: 1,
			metalness: 0,
			roughness: 0,
			ior: 1.376,
			thickness: 1.0,
			side: THREE.DoubleSide,
			transparent: true,
		});
		const mesh = new THREE.Mesh(geometry, meshMat);
		mesh.rotation.y = Math.PI / 2; // Apex points left (-X)
		group.add(mesh);

		// Create Posterior Mesh (to show CCT)
		const postMat = new THREE.MeshPhysicalMaterial({
			color: 0xe0f7fa, // slight blue tint
			transmission: 0.95,
			opacity: 0.8,
			metalness: 0,
			roughness: 0.1,
			ior: 1.336, // aqueous humor
			side: THREE.DoubleSide,
			transparent: true,
		});
		const postMesh = new THREE.Mesh(geometry, postMat);
		postMesh.rotation.y = Math.PI / 2; // Apex points left (-X)
		postMesh.position.x = thickness; // Shift inwards (towards +X) by CCT
		group.add(postMesh);

		// Wireframes
		const wireMat = new THREE.LineBasicMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 0.1,
		});
		const wireframe = new THREE.LineSegments(
			new THREE.WireframeGeometry(geometry),
			wireMat,
		);
		mesh.add(wireframe);

		const postWireMat = new THREE.LineBasicMaterial({
			color: 0x00bcd4,
			transparent: true,
			opacity: 0.1,
		});
		const postWireframe = new THREE.LineSegments(
			new THREE.WireframeGeometry(geometry),
			postWireMat,
		);
		postMesh.add(postWireframe);

		const rays = new THREE.Group();
		group.add(rays);

		geoRef.current = {
			mesh,
			postMesh,
			wire: wireframe,
			postWire: postWireframe,
			rays,
		};

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
						rotation: {
							x: Number(camera.rotation.x.toFixed(3)),
							y: Number(camera.rotation.y.toFixed(3)),
							z: Number(camera.rotation.z.toFixed(3)),
						},
						zoom: Number(camera.zoom.toFixed(3)),
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

		return () => {
			cancelAnimationFrame(animationFrameId);
			resizeObserver.disconnect();
			if (mountRef.current && renderer.domElement.parentNode) {
				mountRef.current.removeChild(renderer.domElement);
			}
			renderer.dispose();
			geometry.dispose();
			meshMat.dispose();
			postMat.dispose();
			wireMat.dispose();
			postWireMat.dispose();
		};
	}, []);

	const [sidebarOpen, setSidebarOpen] = useState(true);

	// Update geometry when sliders change
	useEffect(() => {
		if (!geoRef.current) return;

		const { mesh, postMesh, rays } = geoRef.current;

		const scale = 1.0;
		const Rx = k1 * scale;
		const Ry = k2 * scale;
		const cx = 1 / Rx;
		const cy = 1 / Ry;
		const k = asphericity;
		const maxR = 5.0;

		const radialSegments = 64;
		const angularSegments = 64;

		const geometry = new THREE.BufferGeometry();
		const vertices = [];
		const indices = [];

		for (let i = 0; i <= radialSegments; i++) {
			const r = (i / radialSegments) * maxR;

			for (let j = 0; j <= angularSegments; j++) {
				const theta = (j / angularSegments) * Math.PI * 2;
				const x = r * Math.cos(theta);
				const y = r * Math.sin(theta);

				let z = 0;
				if (r > 0) {
					const denom =
						1 + Math.sqrt(1 - (1 + k) * (cx * cx * x * x + cy * cy * y * y));
					if (
						!isNaN(denom) &&
						denom !== 0 &&
						1 - (1 + k) * (cx * cx * x * x + cy * cy * y * y) >= 0
					) {
						z = (cx * x * x + cy * y * y) / denom;
					} else {
						z = vertices[vertices.length - 3] || 0;
					}
				}

				vertices.push(x, y, z);
			}
		}

		for (let i = 0; i < radialSegments; i++) {
			for (let j = 0; j < angularSegments; j++) {
				const a = i * (angularSegments + 1) + j;
				const b = a + 1;
				const cIdx = (i + 1) * (angularSegments + 1) + j;
				const d = cIdx + 1;
				indices.push(a, b, d);
				indices.push(a, d, cIdx);
			}
		}

		geometry.setAttribute(
			"position",
			new THREE.Float32BufferAttribute(vertices, 3),
		);
		geometry.setIndex(indices);
		geometry.computeVertexNormals();

		const oldGeo = mesh.geometry;
		mesh.geometry = geometry;
		postMesh.geometry = geometry;

		// Update wireframes
		mesh.children[0].geometry = new THREE.WireframeGeometry(geometry);
		postMesh.children[0].geometry = new THREE.WireframeGeometry(geometry);

		// Update CCT offset
		postMesh.position.x = thickness;

		oldGeo.dispose();

		while (rays.children.length > 0) {
			rays.remove(rays.children[0]);
		}

		// Draw Major and Minor Axes on the Cornea
		// Local X-axis meridian (World Z after Math.PI/2 rotation)
		const ptsX = [];
		for (let r = -maxR; r <= maxR; r += 0.1) {
			const denom = 1 + Math.sqrt(1 - (1 + k) * cx * cx * r * r);
			const z = denom > 0 && !isNaN(denom) ? (cx * r * r) / denom : 0;
			ptsX.push(new THREE.Vector3(z, 0, -r)); // World coordinates
		}
		const lineXGeo = new THREE.BufferGeometry().setFromPoints(ptsX);
		const lineXMat = new THREE.LineBasicMaterial({
			color: 0x3b82f6,
			depthTest: false,
			linewidth: 3,
		}); // Blue
		rays.add(new THREE.Line(lineXGeo, lineXMat));

		// Local Y-axis meridian (World Y after Math.PI/2 rotation)
		const ptsY = [];
		for (let r = -maxR; r <= maxR; r += 0.1) {
			const denom = 1 + Math.sqrt(1 - (1 + k) * cy * cy * r * r);
			const z = denom > 0 && !isNaN(denom) ? (cy * r * r) / denom : 0;
			ptsY.push(new THREE.Vector3(z, r, 0)); // World coordinates
		}
		const lineYGeo = new THREE.BufferGeometry().setFromPoints(ptsY);
		const lineYMat = new THREE.LineBasicMaterial({
			color: 0xef4444,
			depthTest: false,
			linewidth: 3,
		}); // Red
		rays.add(new THREE.Line(lineYGeo, lineYMat));

		// Ray tracing - Sturm's Conoid (Two orthogonal planes)
		const numRays = 7;
		const spread = 8.0;

		// 1. Vertical fan (Red rays, Y-axis)
		for (let i = 0; i < numRays; i++) {
			const offset = -spread / 2 + (spread / (numRays - 1)) * i;
			const pts = [];
			pts.push(new THREE.Vector3(-15, offset, 0));

			let hitZ = 0;
			const rootTerm = 1 - (1 + k) * cy * cy * offset * offset;
			if (rootTerm >= 0) {
				hitZ = (cy * offset * offset) / (1 + Math.sqrt(rootTerm));
			} else {
				pts.push(new THREE.Vector3(35, offset, 0));
				const lineMat = new THREE.LineBasicMaterial({
					color: 0xef4444,
					opacity: 0.1,
					transparent: true,
				});
				rays.add(
					new THREE.Line(
						new THREE.BufferGeometry().setFromPoints(pts),
						lineMat,
					),
				);
				continue;
			}

			pts.push(new THREE.Vector3(hitZ, offset, 0));
			const f0 = k2 / 0.376;
			const aberration = (k + 1) * 0.25 * (offset * offset);
			const focusX = f0 - aberration;
			pts.push(new THREE.Vector3(focusX, 0, 0));

			const slope = (0 - offset) / (focusX - hitZ);
			const endX = 35;
			const endY = slope * (endX - focusX);
			pts.push(new THREE.Vector3(endX, endY, 0));

			const lineMat = new THREE.LineBasicMaterial({
				color: 0xef4444,
				opacity: 0.6,
				transparent: true,
			});
			rays.add(
				new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat),
			);
		}

		// 2. Horizontal fan (Blue rays, Z-axis)
		for (let i = 0; i < numRays; i++) {
			const offset = -spread / 2 + (spread / (numRays - 1)) * i;
			const pts = [];
			pts.push(new THREE.Vector3(-15, 0, offset));

			let hitZ = 0;
			const rootTerm = 1 - (1 + k) * cx * cx * offset * offset;
			if (rootTerm >= 0) {
				hitZ = (cx * offset * offset) / (1 + Math.sqrt(rootTerm));
			} else {
				pts.push(new THREE.Vector3(35, 0, offset));
				const lineMat = new THREE.LineBasicMaterial({
					color: 0x3b82f6,
					opacity: 0.1,
					transparent: true,
				});
				rays.add(
					new THREE.Line(
						new THREE.BufferGeometry().setFromPoints(pts),
						lineMat,
					),
				);
				continue;
			}

			pts.push(new THREE.Vector3(hitZ, 0, offset));
			const f0 = k1 / 0.376;
			const aberration = (k + 1) * 0.25 * (offset * offset);
			const focusX = f0 - aberration;
			pts.push(new THREE.Vector3(focusX, 0, 0));

			const slope = (0 - offset) / (focusX - hitZ);
			const endX = 35;
			const endZ = slope * (endX - focusX);
			pts.push(new THREE.Vector3(endX, 0, endZ));

			const lineMat = new THREE.LineBasicMaterial({
				color: 0x3b82f6,
				opacity: 0.6,
				transparent: true,
			});
			rays.add(
				new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat),
			);
		}
	}, [k1, k2, asphericity, thickness]);

	// Calculate directional blur for simulated vision
	const idealK = 7.8;
	const idealQ = -0.26;
	const idealThickness = 0.55; // 550 microns is normal CCT

	const errorK1 = Math.abs(k1 - idealK);
	const errorK2 = Math.abs(k2 - idealK);
	const aberrationError = Math.abs(asphericity - idealQ);
	const thicknessError = Math.abs(thickness - idealThickness);

	// Astigmatism causes directional blur (K1 = X-axis, K2 = Y-axis).
	// Aberration causes a soft glow.
	// Thickness deviations cause a slight myopic/hyperopic spherical shift (uniform blur).
	// Multiplied by 60 to make the microscopic effect visually apparent in the UI.
	const blurX = errorK1 * 2.5 + aberrationError * 5.0 + thicknessError * 60.0;
	const blurY = errorK2 * 2.5 + aberrationError * 5.0 + thicknessError * 60.0;

	const renderCrossOptotype = (filterId: string) => (
		<svg
			width="40"
			height="40"
			viewBox="0 0 100 100"
			style={{ filter: `url(#${filterId})` }}
		>
			{/* Vertical arm */}
			<line
				x1="42"
				y1="10"
				x2="42"
				y2="90"
				stroke="currentColor"
				strokeWidth="3"
				strokeLinecap="round"
			/>
			<line
				x1="50"
				y1="10"
				x2="50"
				y2="90"
				stroke="currentColor"
				strokeWidth="3"
				strokeLinecap="round"
			/>
			<line
				x1="58"
				y1="10"
				x2="58"
				y2="90"
				stroke="currentColor"
				strokeWidth="3"
				strokeLinecap="round"
			/>
			{/* Horizontal arm */}
			<line
				x1="10"
				y1="42"
				x2="90"
				y2="42"
				stroke="currentColor"
				strokeWidth="3"
				strokeLinecap="round"
			/>
			<line
				x1="10"
				y1="50"
				x2="90"
				y2="50"
				stroke="currentColor"
				strokeWidth="3"
				strokeLinecap="round"
			/>
			<line
				x1="10"
				y1="58"
				x2="90"
				y2="58"
				stroke="currentColor"
				strokeWidth="3"
				strokeLinecap="round"
			/>
		</svg>
	);

	return (
		<div className="relative w-full h-[500px] md:h-[600px] bg-transparent overflow-hidden rounded-lg group">
			<div
				ref={mountRef}
				className="absolute inset-0 cursor-grab active:cursor-grabbing"
			/>

			{/* Simulated Vision Overlay */}
			<div className="absolute bottom-4 left-4 z-20 flex flex-col items-center bg-card/80 backdrop-blur-md border border-border p-3 rounded-xl shadow-lg pointer-events-none">
				<span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground border-b border-border/50 pb-1 w-full text-center mb-2">
					Simulated Vision
				</span>
				<div className="bg-white p-2 rounded flex items-center justify-center w-16 h-16 relative overflow-hidden">
					<svg width="0" height="0" className="absolute">
						<defs>
							<filter id="astigBlurCore">
								<feGaussianBlur
									stdDeviation={`${blurX * 0.3},${blurY * 0.3}`}
								/>
							</filter>
							<filter id="astigBlurHalo">
								<feGaussianBlur stdDeviation={`${blurX},${blurY}`} />
							</filter>
						</defs>
					</svg>

					<div
						className="absolute inset-0 flex items-center justify-center text-black"
						style={{ opacity: 0.6 }}
					>
						{renderCrossOptotype("astigBlurHalo")}
					</div>
					<div className="absolute inset-0 flex items-center justify-center text-black">
						{renderCrossOptotype("astigBlurCore")}
					</div>
				</div>
			</div>

			<button
				onClick={() => setSidebarOpen(!sidebarOpen)}
				className="absolute top-4 right-4 z-20 px-2 py-1.5 rounded-md bg-transparent hover:bg-background/40 backdrop-blur-sm border border-transparent hover:border-border/30 transition-all text-[10px] uppercase tracking-wider font-bold flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<line x1="4" y1="21" x2="4" y2="14"></line>
					<line x1="4" y1="10" x2="4" y2="3"></line>
					<line x1="12" y1="21" x2="12" y2="12"></line>
					<line x1="12" y1="8" x2="12" y2="3"></line>
					<line x1="20" y1="21" x2="20" y2="16"></line>
					<line x1="20" y1="12" x2="20" y2="3"></line>
					<line x1="1" y1="14" x2="7" y2="14"></line>
					<line x1="9" y1="8" x2="15" y2="8"></line>
					<line x1="17" y1="16" x2="23" y2="16"></line>
				</svg>
				{sidebarOpen ? "Hide" : "Controls"}
			</button>

			{/* Control Panel */}
			<div
				className={`absolute top-12 right-4 w-[220px] p-3 border border-border/10 hover:border-border/30 bg-background/30 hover:bg-background/80 backdrop-blur-md rounded-xl shadow-sm hover:shadow-lg flex flex-col gap-3 text-xs z-10 transition-all duration-300 origin-top-right ${sidebarOpen ? "scale-100 opacity-100 pointer-events-auto" : "scale-95 opacity-0 pointer-events-none"}`}
			>
				<div>
					<label className="flex justify-between mb-1 font-medium text-foreground/80">
						<span>K1 (Flat)</span>
						<span className="text-muted-foreground">{k1.toFixed(1)} mm</span>
					</label>
					<input
						type="range"
						min="6.0"
						max="9.0"
						step="0.1"
						value={k1}
						onChange={(e) => setK1(parseFloat(e.target.value))}
						className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
					/>
				</div>
				<div>
					<label className="flex justify-between mb-1 font-medium text-foreground/80">
						<span>K2 (Steep)</span>
						<span className="text-muted-foreground">{k2.toFixed(1)} mm</span>
					</label>
					<input
						type="range"
						min="6.0"
						max="9.0"
						step="0.1"
						value={k2}
						onChange={(e) => setK2(parseFloat(e.target.value))}
						className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
					/>
				</div>
				<div>
					<label className="flex justify-between mb-1 font-medium text-foreground/80">
						<span>Asphericity (Q)</span>
						<span className="text-muted-foreground">
							{asphericity.toFixed(2)}
						</span>
					</label>
					<input
						type="range"
						min="-1.0"
						max="1.0"
						step="0.01"
						value={asphericity}
						onChange={(e) => setAsphericity(parseFloat(e.target.value))}
						className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
					/>
				</div>
				<div>
					<label className="flex justify-between mb-1 font-medium text-foreground/80">
						<span>Thickness</span>
						<span className="text-muted-foreground">
							{Math.round(thickness * 1000)} µm
						</span>
					</label>
					<input
						type="range"
						min="0.4"
						max="0.7"
						step="0.01"
						value={thickness}
						onChange={(e) => setThickness(parseFloat(e.target.value))}
						className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
					/>
				</div>
			</div>
		</div>
	);
}

export default function CorneaMaster() {
	return (
		<ErrorBoundary>
			<CorneaMasterInner />
		</ErrorBoundary>
	);
}
