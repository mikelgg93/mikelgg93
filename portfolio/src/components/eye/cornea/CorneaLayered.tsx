import ParameterControl, { useInitialParameters } from "../ParameterControl";
import "./cornea.css";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createDemoLoop } from "../demoLoop";
import { disposeThree } from "../disposeThree";
import { eyeText } from "../earlyText";
import { observeThreeResize } from "../threeResize";

// Illustrative layer thicknesses (µm), totaling 540 µm. The collapsed slabs
// preserve relative thickness, with a visibility floor for the thinnest layer.
const LAYERS = [
	{
		id: "epi",
		name: "1. Epithelium",
		um: 50,
		color: 0x38bdf8,
		detail: "cells",
		desc: "Renewing outer cells; smooth support for tears.",
	},
	{
		id: "bowman",
		name: "2. Bowman's Layer",
		um: 10,
		color: 0x34d399,
		detail: "solid",
		desc: "Acellular collagen layer beneath the epithelium; does not regenerate like the epithelium.",
	},
	{
		id: "stroma",
		name: "3. Stroma",
		um: 452,
		color: 0x94a3b8,
		detail: "lamellae",
		desc: "Most of the thickness. Interwoven collagen lamellae; orientations are schematic here.",
	},
	{
		id: "dua",
		name: "4. Pre-Descemet (proposed)",
		um: 15,
		color: 0xfbbf24,
		detail: "solid",
		desc: "Proposed pre-Descemet layer; classification is debated.",
	},
	{
		id: "descemet",
		name: "5. Descemet's Membrane",
		um: 8,
		color: 0x818cf8,
		detail: "solid",
		desc: "Elastic basement membrane the endothelium sits on.",
	},
	{
		id: "endo",
		name: "6. Endothelium",
		um: 5,
		color: 0xf43f5e,
		detail: "hex",
		desc: "Single sheet of hexagonal cells pumping water out to keep the cornea clear.",
	},
];

const SCALE = 0.011; // µm -> world units
const HALF = 2.6; // footprint half-width
const TOTAL = LAYERS.reduce((s, l) => s + l.um, 0);

// Parallel collagen fibers on a plane at height y, rotated by `angle`.
function fiberLines(y: number, angle: number, color: number) {
	const pts: number[] = [];
	const n = 16;
	for (let i = 0; i < n; i++) {
		const off = -HALF + (i / (n - 1)) * 2 * HALF;
		pts.push(-HALF, y, off, HALF, y, off);
	}
	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
	const line = new THREE.LineSegments(
		geo,
		new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 }),
	);
	line.rotation.y = angle;
	return line;
}

// Hexagon outlines tiling a plane (endothelial mosaic).
function hexGrid(y: number, color: number) {
	const group = new THREE.Group();
	const R = 0.34;
	const mat = new THREE.LineBasicMaterial({
		color,
		transparent: true,
		opacity: 0.8,
	});
	const dx = R * 1.5;
	const dz = R * Math.sqrt(3);
	for (let row = -5; row <= 5; row++) {
		for (let col = -5; col <= 5; col++) {
			const cx = col * dx;
			const cz = row * dz + (col % 2 ? dz / 2 : 0);
			if (Math.abs(cx) > HALF - 0.1 || Math.abs(cz) > HALF - 0.1) continue;
			const pts: THREE.Vector3[] = [];
			for (let k = 0; k <= 6; k++) {
				const a = (k / 6) * Math.PI * 2;
				pts.push(
					new THREE.Vector3(cx + R * Math.cos(a), y, cz + R * Math.sin(a)),
				);
			}
			group.add(
				new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat),
			);
		}
	}
	return group;
}

// Small rounded cells scattered on a plane (epithelial mosaic).
function cellDots(y: number, color: number) {
	const group = new THREE.Group();
	const mat = new THREE.MeshBasicMaterial({
		color,
		transparent: true,
		opacity: 0.5,
		side: THREE.DoubleSide,
	});
	const geo = new THREE.CircleGeometry(0.2, 14);
	for (let x = -HALF + 0.25; x < HALF; x += 0.5) {
		for (let z = -HALF + 0.25; z < HALF; z += 0.5) {
			const m = new THREE.Mesh(geo, mat);
			m.position.set(
				x + (Math.random() - 0.5) * 0.12,
				y,
				z + (Math.random() - 0.5) * 0.12,
			);
			m.rotation.x = -Math.PI / 2;
			group.add(m);
		}
	}
	return group;
}

export default function CorneaLayered({ lang = "en" }: { lang?: "en" | "es" }) {
	const t = eyeText(lang);
	const mountRef = useRef<HTMLDivElement>(null);
	const [exploded, setExploded] = useState(false);
	const [active, setActive] = useState<string | null>(null);
	const explodedRef = useRef(false);
	const activeRef = useRef<string | null>(null);
	explodedRef.current = exploded;
	activeRef.current = active;

	useEffect(() => {
		if (!mountRef.current) return;

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
		camera.position.set(6, 3.5, 8);

		scene.add(new THREE.AmbientLight(0xffffff, 0.85));
		const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
		dirLight.position.set(6, 12, 8);
		scene.add(dirLight);

		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setClearColor(0x000000, 0);
		mountRef.current.appendChild(renderer.domElement);

		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;

		const resizeObserver = observeThreeResize(
			mountRef.current,
			renderer,
			camera,
		);

		const layerGroups: {
			group: THREE.Group;
			slab: THREE.Mesh;
			index: number;
			baseY: number;
			trueH: number;
			solid: boolean;
		}[] = [];
		let top = (TOTAL * SCALE) / 2;

		LAYERS.forEach((l, idx) => {
			const h = Math.max(l.um * SCALE, 0.06); // floor so the thinnest layers stay visible
			const centerY = top - (l.um * SCALE) / 2;
			top -= l.um * SCALE;

			const group = new THREE.Group();
			const isStroma = l.detail === "lamellae";

			const slabGeo = new THREE.BoxGeometry(2 * HALF, h, 2 * HALF);
			const slabMat = new THREE.MeshStandardMaterial({
				color: l.color,
				roughness: 0.55,
				// Only the big stroma is see-through, so its fibers show without the
				// whole stack turning into overlapping glass (the earlier glitch).
				transparent: isStroma,
				opacity: isStroma ? 0.35 : 1.0,
				depthWrite: !isStroma,
			});
			const slab = new THREE.Mesh(slabGeo, slabMat);
			group.add(slab);

			// Crisp outline so each layer reads as a distinct block.
			const edges = new THREE.LineSegments(
				new THREE.EdgesGeometry(slabGeo),
				new THREE.LineBasicMaterial({
					color: 0xffffff,
					transparent: true,
					opacity: 0.25,
				}),
			);
			group.add(edges);

			if (isStroma) {
				const sheets = 14;
				for (let s = 0; s < sheets; s++) {
					const ly = -h / 2 + ((s + 0.5) / sheets) * h;
					const angle = s % 2 === 0 ? 0 : Math.PI / 2; // plywood: orthogonal sheets
					group.add(fiberLines(ly, angle, 0xe2e8f0));
				}
			} else if (l.detail === "hex") {
				group.add(hexGrid(h / 2 + 0.01, 0xffffff));
			} else if (l.detail === "cells") {
				group.add(cellDots(h / 2 + 0.01, 0xffffff));
			}

			group.position.y = centerY;
			scene.add(group);
			layerGroups.push({
				group,
				slab,
				index: idx,
				baseY: centerY,
				trueH: h,
				solid: !isStroma,
			});
		});

		let explodeT = 0;
		const loop = createDemoLoop(mountRef.current, {
			controls: controls,
			draw: (dt, _elapsed, reducedMotion) => {
				const target = explodedRef.current ? 1 : 0;
				explodeT = reducedMotion
					? target
					: explodeT + (target - explodeT) * (1 - Math.exp(-dt / 0.2));
				if (Math.abs(target - explodeT) < 0.001) explodeT = target;
				const gap = 0.95;
				const DISPLAY_H = 0.5;
				layerGroups.forEach(({ group, slab, index, baseY, trueH, solid }) => {
					// Collapsed: layers sit at true relative scale (stroma dominates).
					// Exploded: each layer compresses to a uniform thin plate and fans out
					// to an evenly spaced, ordered position, so nothing overlaps. The µm
					// labels in the panel carry the real thickness.
					const explodedY = (2.5 - index) * gap;
					group.position.y = baseY * (1 - explodeT) + explodedY * explodeT;
					group.scale.y = 1 - explodeT + (DISPLAY_H / trueH) * explodeT;
					const isActive = activeRef.current === LAYERS[index]!.id;
					const mat = slab.material as THREE.MeshStandardMaterial;
					const dim = activeRef.current && !isActive;
					mat.opacity = solid ? (dim ? 0.25 : 1.0) : dim ? 0.12 : 0.35;
					mat.emissive.setHex(isActive ? 0x444444 : 0x000000);
				});
				renderer.render(scene, camera);
				return explodeT !== target;
			},
			inspect: () => ({
				model: "Layer schematic",
				thicknessUm: 540,
				layers: LAYERS.map(({ id, um }) => ({ id, um })),
				exploded: explodedRef.current,
				selectedLayer: activeRef.current,
				camera: camera.position.toArray(),
				target: controls.target.toArray(),
			}),
		});

		return () => {
			loop.dispose();
			resizeObserver.disconnect();
			if (mountRef.current && renderer.domElement.parentNode) {
				mountRef.current.removeChild(renderer.domElement);
			}
			controls.dispose();
			disposeThree(scene);
			renderer.dispose();
		};
	}, []);

	const defaults = useInitialParameters(
		{ exploded, active },
		(initial) => {
			setExploded(initial.exploded);
			setActive(initial.active);
		},
		mountRef,
	);
	return (
		<div className="cornea-demo relative w-full h-[500px] md:h-[600px] bg-transparent overflow-hidden rounded-lg group">
			<div className="cornea-metrics absolute top-4 left-4 z-10 flex flex-col items-start gap-1 bg-card/80 backdrop-blur-md border border-border p-3 rounded-xl shadow-lg max-w-[260px]">
				<span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1 border-b border-border/50 pb-1 w-full text-center">
					{t("Corneal layers (model)")}
				</span>
				<ParameterControl
					hideReset
					value={active}
					initial={defaults.active}
					onReset={setActive}
					label="selected layer"
					lang={lang}
				>
					<div className="flex flex-col gap-1 w-full text-xs">
						{LAYERS.map((l) => (
							<div
								key={l.id}
								onClick={() => setActive(active === l.id ? null : l.id)}
								className={`flex justify-between items-center px-1.5 py-0.5 rounded cursor-pointer transition-colors ${active === l.id ? "bg-primary/20 border border-primary/50" : "hover:bg-muted/40"}`}
							>
								<div className="flex items-center gap-1.5">
									<span
										className="w-2.5 h-2.5 rounded-full"
										style={{
											backgroundColor: `#${l.color.toString(16).padStart(6, "0")}`,
										}}
									></span>
									<span className="font-semibold text-foreground text-[11px]">
										{t(l.name)}
									</span>
								</div>
								<span className="font-mono text-[10px] text-muted-foreground font-bold ml-2">
									{l.um} µm
								</span>
							</div>
						))}
					</div>
				</ParameterControl>
				{active && (
					<p className="text-[10px] text-muted-foreground leading-relaxed mt-1 pt-1 border-t border-border/40">
						{t(LAYERS.find((l) => l.id === active)?.desc ?? "")}
					</p>
				)}
			</div>

			<ParameterControl
				hideReset
				value={exploded}
				initial={defaults.exploded}
				onReset={setExploded}
				label="layer separation"
				className="cornea-actions absolute bottom-4 md:left-1/2 md:-translate-x-1/2 z-20"
				lang={lang}
			>
				<button
					onClick={() => setExploded((e) => !e)}
					className="px-5 py-2 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-xl hover:opacity-90 transition-opacity"
				>
					{exploded ? t("Collapse layers") : t("Explode layers")}
				</button>
			</ParameterControl>

			<div
				ref={mountRef}
				className="cornea-scene w-full h-full cursor-grab active:cursor-grabbing"
			/>
		</div>
	);
}
