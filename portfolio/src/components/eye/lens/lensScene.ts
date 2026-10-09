import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { disposeThree } from "../disposeThree";
import { observeThreeResize } from "../threeResize";

export type LensView = "front" | "side" | "back" | "section" | "reset";
type FrameState = { state: object; animating?: boolean };

// Islands draw on demand, including while easing or orbit damping is active.
export function createLensScene(
	container: HTMLDivElement,
	distance = 26,
	lang: "en" | "es" = "en",
) {
	const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.setSize(container.clientWidth, container.clientHeight);
	renderer.localClippingEnabled = true;
	container.appendChild(renderer.domElement);
	const scene = new THREE.Scene();
	// Transmission samples the WebGL background, not the CSS behind the canvas.
	scene.background = new THREE.Color(0x092a2a);
	scene.environmentIntensity = 0.45;
	// Original procedural studio reflections; no photographic environment assets.
	function createEnvironment() {
		const room = new RoomEnvironment();
		const pmrem = new THREE.PMREMGenerator(renderer);
		try {
			return pmrem.fromScene(room, 0.04);
		} finally {
			disposeThree(room);
			pmrem.dispose();
		}
	}
	let environment = createEnvironment();
	scene.environment = environment.texture;
	const camera = new THREE.PerspectiveCamera(
		35,
		container.clientWidth / Math.max(1, container.clientHeight),
		0.1,
		100,
	);
	camera.position.set(distance * 0.52, distance * 0.23, distance * 0.82);
	const initialCamera = camera.position.clone();
	function makeControls() {
		const orbit = new OrbitControls(camera, renderer.domElement);
		orbit.enableDamping = true;
		orbit.enablePan = false;
		orbit.minDistance = distance * 0.8;
		orbit.maxDistance = distance * 1.6;
		return orbit;
	}
	let controls = makeControls();
	scene.add(new THREE.HemisphereLight(0xcdf4ff, 0x102323, 2));
	const light = new THREE.DirectionalLight(0xffffff, 2.5);
	light.position.set(-5, 7, 12);
	scene.add(light);
	const orientation = document.createElement("div");
	orientation.className = "lens-orientation";
	orientation.setAttribute("aria-hidden", "true");
	container.appendChild(orientation);
	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	const debug = container
		.closest(".interactive-viewer")
		?.querySelector(".debug-output");
	let visible = true,
		disposed = false,
		rendering = false,
		frame = 0;
	let lastTime = performance.now();
	let update: ((dt: number, reducedMotion: boolean) => FrameState) | undefined;
	function invalidate() {
		if (
			!disposed &&
			!rendering &&
			visible &&
			!document.hidden &&
			update &&
			!frame
		)
			frame = requestAnimationFrame(animate);
	}
	function animate(now: number) {
		frame = 0;
		if (disposed || !visible || document.hidden || !update) return;
		rendering = true;
		const dt = Math.max(0, Math.min((now - lastTime) / 1000, 0.1));
		lastTime = now;
		const result = update(dt, reducedMotion.matches);
		const cameraChanged = controls.update();
		renderer.render(scene, camera);
		const facing = camera.position.z / camera.position.length();
		orientation.textContent =
			lang === "es"
				? facing > 0.35
					? "Desde delante · lado de la córnea"
					: facing < -0.35
						? "Desde detrás · lado de la retina"
						: "Vista lateral"
				: facing > 0.35
					? "From the front · corneal side"
					: facing < -0.35
						? "From the back · retinal side"
						: "Side view";
		if (debug)
			debug.textContent = JSON.stringify(
				{
					...result.state,
					camera: camera.position.toArray(),
					geometries: renderer.info.memory.geometries,
				},
				null,
				2,
			);
		rendering = false;
		if (result.animating || cameraChanged) invalidate();
	}
	const resize = observeThreeResize(container, renderer, camera, invalidate);
	const observer = new IntersectionObserver(([entry]) => {
		visible = entry?.isIntersecting ?? false;
		if (visible) invalidate();
		else {
			cancelAnimationFrame(frame);
			frame = 0;
		}
	});
	observer.observe(container);
	controls.addEventListener("change", invalidate);
	document.addEventListener("visibilitychange", invalidate);
	reducedMotion.addEventListener("change", invalidate);
	function restoreEnvironment() {
		environment.dispose();
		environment = createEnvironment();
		scene.environment = environment.texture;
		invalidate();
	}
	renderer.domElement.addEventListener(
		"webglcontextrestored",
		restoreEnvironment,
	);
	return {
		scene,
		camera,
		get controls() {
			return controls;
		},
		renderer,
		invalidate,
		start(callback: NonNullable<typeof update>) {
			initialCamera.copy(camera.position);
			update = callback;
			invalidate();
		},
		setView(view: LensView) {
			// Flush pending damping before setting a deterministic camera preset.
			const damping = controls.enableDamping;
			controls.enableDamping = false;
			controls.update();
			controls.target.set(0, 0, 0);
			const upChanged = camera.up.z !== (view === "section" ? 1 : 0);
			camera.up.set(0, view === "section" ? 0 : 1, view === "section" ? 1 : 0);
			if (view === "reset") camera.position.copy(initialCamera);
			else if (view === "section")
				camera.position.set(0, distance, distance * 0.12);
			else
				camera.position.set(
					view === "side" ? distance : 0,
					0,
					view === "front" ? distance : view === "back" ? -distance : 0,
				);
			// OrbitControls caches its up-axis basis in the constructor.
			if (upChanged) {
				controls.removeEventListener("change", invalidate);
				controls.dispose();
				controls = makeControls();
				controls.addEventListener("change", invalidate);
			}
			controls.update();
			controls.enableDamping = damping;
			invalidate();
		},
		dispose() {
			disposed = true;
			cancelAnimationFrame(frame);
			observer.disconnect();
			resize.disconnect();
			controls.removeEventListener("change", invalidate);
			document.removeEventListener("visibilitychange", invalidate);
			reducedMotion.removeEventListener("change", invalidate);
			renderer.domElement.removeEventListener(
				"webglcontextrestored",
				restoreEnvironment,
			);
			controls.dispose();
			disposeThree(scene);
			scene.environment = null;
			environment.dispose();
			renderer.dispose();
			renderer.forceContextLoss();
			renderer.domElement.remove();
			orientation.remove();
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
