import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { disposeThree } from "../disposeThree";
import { observeThreeResize } from "../threeResize";

// Each island owns one context. Hidden demos stop drawing; all owned GPU
// resources and observers are released when Astro removes the island.
export function createLensScene(container: HTMLDivElement, distance = 26) {
	const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.setSize(container.clientWidth, container.clientHeight);
	renderer.localClippingEnabled = true;
	container.appendChild(renderer.domElement);
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(
		35,
		container.clientWidth / Math.max(1, container.clientHeight),
		0.1,
		100,
	);
	camera.position.set(distance * 0.52, distance * 0.23, distance * 0.82);
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.enablePan = false;
	controls.minDistance = distance * 0.8;
	controls.maxDistance = distance * 1.6;
	scene.add(new THREE.HemisphereLight(0xcdf4ff, 0x102323, 2));
	const light = new THREE.DirectionalLight(0xffffff, 2.5);
	light.position.set(-5, 7, 12);
	scene.add(light);
	const resize = observeThreeResize(container, renderer, camera);
	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	const debug = container
		.closest(".interactive-viewer")
		?.querySelector(".debug-output");
	let visible = true;
	let frame = 0;
	const observer = new IntersectionObserver(([entry]) => {
		visible = entry?.isIntersecting ?? false;
	});
	observer.observe(container);
	return {
		scene,
		camera,
		controls,
		renderer,
		start(update: (dt: number, reducedMotion: boolean) => object) {
			let lastTime = performance.now();
			let lastDebug = 0;
			const animate = (now: number) => {
				frame = requestAnimationFrame(animate);
				const dt = Math.max(0, Math.min((now - lastTime) / 1000, 0.1));
				lastTime = now;
				if (!visible || document.hidden) return;
				const state = update(dt, reducedMotion.matches);
				controls.update();
				renderer.render(scene, camera);
				if (debug && now - lastDebug > 500) {
					debug.textContent = JSON.stringify(
						{
							...state,
							camera: camera.position.toArray(),
							geometries: renderer.info.memory.geometries,
						},
						null,
						2,
					);
					lastDebug = now;
				}
			};
			frame = requestAnimationFrame(animate);
		},
		dispose() {
			cancelAnimationFrame(frame);
			observer.disconnect();
			resize.disconnect();
			controls.dispose();
			disposeThree(scene);
			renderer.dispose();
			renderer.forceContextLoss();
			renderer.domElement.remove();
		},
	};
}

export function createLensGeometry() {
	const geometry = new THREE.SphereGeometry(1, 64, 32);
	const positions = geometry.getAttribute("position");
	for (let i = 0; i < positions.count; i++) {
		const z = positions.getZ(i);
		positions.setZ(i, z * (z > 0 ? 0.85 : 1.15));
	}
	geometry.computeVertexNormals();
	return geometry;
}
