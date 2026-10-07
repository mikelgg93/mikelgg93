import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { observeThreeResize } from "../threeResize";

// Average anatomical values (mm). Built at true scale, framed by the camera.
const R_ANT = 7.8; // anterior radius of curvature
const Q_ANT = -0.26; // anterior asphericity (prolate)
const R_POST = 6.5; // posterior radius (steeper)
const Q_POST = -0.4;
const CCT = 0.55; // central corneal thickness
const SEMI = 5.0; // optical-zone semi-diameter

function sag(r: number, R: number, Q: number) {
	const c = 1 / R;
	const root = 1 - (1 + Q) * c * c * r * r;
	return root >= 0 ? (c * r * r) / (1 + Math.sqrt(root)) : c * r * r;
}

// Meniscus cornea: aspheric front, steeper back, joined at the rim, lathed into
// a closed glassy solid.
function corneaLathe() {
	const steps = 128;
	const pts: THREE.Vector2[] = [];
	for (let i = 0; i <= steps; i++) {
		const r = (i / steps) * SEMI;
		pts.push(new THREE.Vector2(r, -sag(r, R_ANT, Q_ANT)));
	}
	for (let i = steps; i >= 0; i--) {
		const r = (i / steps) * SEMI;
		pts.push(new THREE.Vector2(r, -CCT - sag(r, R_POST, Q_POST)));
	}
	const geo = new THREE.LatheGeometry(pts, 160);
	geo.center();
	geo.computeVertexNormals();
	return geo;
}

// Surrounding studio world: dark gradient + faint grid on the inside of a big
// sphere, visible from any angle and something for the cornea to refract.
function worldTexture() {
	const w = 2048,
		h = 1024;
	const c = document.createElement("canvas");
	c.width = w;
	c.height = h;
	const ctx = c.getContext("2d")!;
	const g = ctx.createLinearGradient(0, 0, 0, h);
	g.addColorStop(0, "#0a1512");
	g.addColorStop(0.5, "#16241f");
	g.addColorStop(1, "#05080a");
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, w, h);
	ctx.strokeStyle = "rgba(130,180,190,0.15)";
	ctx.lineWidth = 2;
	for (let i = 0; i <= 48; i++) {
		ctx.beginPath();
		ctx.moveTo((i / 48) * w, 0);
		ctx.lineTo((i / 48) * w, h);
		ctx.stroke();
	}
	for (let j = 0; j <= 24; j++) {
		ctx.beginPath();
		ctx.moveTo(0, (j / 24) * h);
		ctx.lineTo(w, (j / 24) * h);
		ctx.stroke();
	}
	const tex = new THREE.CanvasTexture(c);
	tex.colorSpace = THREE.SRGBColorSpace;
	return tex;
}

// Smooth grayscale noise varying the tear-film thickness (oil-slick bands).
function thicknessMap() {
	const small = document.createElement("canvas");
	small.width = small.height = 16;
	const sctx = small.getContext("2d")!;
	const img = sctx.createImageData(16, 16);
	for (let i = 0; i < img.data.length; i += 4) {
		const v = Math.floor(Math.random() * 255);
		img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
		img.data[i + 3] = 255;
	}
	sctx.putImageData(img, 0, 0);
	const big = document.createElement("canvas");
	big.width = big.height = 256;
	const bctx = big.getContext("2d")!;
	bctx.imageSmoothingEnabled = true;
	bctx.drawImage(small, 0, 0, 256, 256);
	return new THREE.CanvasTexture(big);
}

export default function CorneaRealistic() {
	const mountRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!mountRef.current) return;

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
		camera.position.set(6, 4, 18);

		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setClearColor(0x000000, 0);
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.15;
		mountRef.current.appendChild(renderer.domElement);

		const pmrem = new THREE.PMREMGenerator(renderer);
		const environment = new RoomEnvironment();
		const environmentTarget = pmrem.fromScene(environment, 0.04);
		environment.dispose();
		scene.environment = environmentTarget.texture;

		const controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;
		controls.enablePan = false;
		controls.minDistance = 12;
		controls.maxDistance = 45;

		const resizeObserver = observeThreeResize(
			mountRef.current,
			renderer,
			camera,
		);

		const dir = new THREE.DirectionalLight(0xffffff, 2.4);
		dir.position.set(-6, 9, 12);
		scene.add(dir);
		scene.add(new THREE.AmbientLight(0xffffff, 0.25));

		// Softbox-style light: reflects off the wet surface as a crisp catchlight.
		RectAreaLightUniformsLib.init();
		const softbox = new THREE.RectAreaLight(0xffffff, 6, 7, 4);
		softbox.position.set(-7, 8, 11);
		softbox.lookAt(0, 0, 0);
		scene.add(softbox);

		// Surrounding world.
		const worldTex = worldTexture();
		const world = new THREE.Mesh(
			new THREE.SphereGeometry(60, 48, 48),
			new THREE.MeshBasicMaterial({ map: worldTex, side: THREE.BackSide }),
		);
		scene.add(world);

		const geo = corneaLathe();
		const filmMap = thicknessMap();
		filmMap.wrapS = filmMap.wrapT = THREE.RepeatWrapping;
		const mat = new THREE.MeshPhysicalMaterial({
			color: 0xffffff,
			transmission: 1.0,
			thickness: CCT,
			ior: 1.376,
			// Chromatic dispersion: rainbow fringing at refracted edges.
			dispersion: 0.4,
			roughness: 0.015,
			metalness: 0.0,
			// Wet surface reflection.
			clearcoat: 1.0,
			clearcoatRoughness: 0.015,
			specularIntensity: 1.0,
			envMapIntensity: 1.3,
			// Tear-film thin-film interference (oil-slick sheen).
			iridescence: 1.0,
			iridescenceIOR: 1.32,
			iridescenceThicknessRange: [80, 420],
			iridescenceThicknessMap: filmMap,
			// A touch of anisotropy from the corneal collagen grain.
			anisotropy: 0.2,
			transparent: true,
			attenuationColor: new THREE.Color(0xd6ecff),
			attenuationDistance: 12,
			side: THREE.DoubleSide,
		});
		const cornea = new THREE.Mesh(geo, mat);
		cornea.rotation.x = -Math.PI / 2; // axis toward the camera (+Z)
		scene.add(cornea);

		let animationFrameId: number;
		const animate = () => {
			animationFrameId = requestAnimationFrame(animate);

			// Slowly drift the tear-film thickness so the sheen moves like tears
			// spreading across the surface after a blink.
			filmMap.offset.x += 0.0006;
			filmMap.offset.y += 0.0003;

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
			controls.dispose();
			geo.dispose();
			mat.dispose();
			filmMap.dispose();
			worldTex.dispose();
			world.geometry.dispose();
			(world.material as THREE.Material).dispose();
			environmentTarget.dispose();
			pmrem.dispose();
			renderer.dispose();
		};
	}, []);

	return (
		<div className="relative w-full h-[500px] md:h-[600px] bg-transparent overflow-hidden rounded-lg group">
			<div className="absolute top-4 left-4 z-10 flex flex-col items-start gap-1 pointer-events-none bg-card/80 backdrop-blur-md border border-border p-3 rounded-xl shadow-lg">
				<span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1 border-b border-border/50 pb-1 w-full text-center">
					Hyperrealistic Cornea
				</span>
				<div className="text-[10px] text-muted-foreground max-w-[220px] leading-relaxed">
					Built to average anatomy: R<sub>ant</sub> 7.8 mm, R<sub>post</sub> 6.5
					mm, Q −0.26, thickness 0.55 mm. Glassy transmission with dispersion, a
					drifting tear-film sheen, and reflections. Drag to orbit.
				</div>
			</div>
			<div
				ref={mountRef}
				className="w-full h-full cursor-grab active:cursor-grabbing"
			/>
		</div>
	);
}
