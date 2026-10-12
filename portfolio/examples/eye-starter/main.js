import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// 0. A scene has units only because we give them a meaning: 1 unit = 1 mm.
const mount = document.querySelector("#scene");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080b0d);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 150);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
mount.append(renderer.domElement);
const orbit = new OrbitControls(camera, renderer.domElement);
renderer.domElement.style.touchAction = "pan-y";
orbit.enableDamping = true;
orbit.enableZoom = false; // scrolling stays with the page
const axes = new THREE.AxesHelper(5); // x red, y green, z blue; origin = anterior apex
scene.add(axes, new THREE.HemisphereLight(0xd9f4ff, 0x143331, 2));
const light = new THREE.DirectionalLight(0xffffff, 3);
light.position.set(-10, 12, 20);
scene.add(light);
const model = new THREE.Group();
scene.add(model);

const R = 7.8,
	Q = -0.26,
	aperture = 5,
	cct = 0.55;
function sag(r, radius, q) {
	return (
		(r * r) / radius / (1 + Math.sqrt(1 - ((1 + q) * r * r) / radius ** 2))
	);
}

// 3. Replace spherical vertices with rings on a conic. Stay inside its domain.
function conic(radius, q, apexZ) {
	const limit =
		q > -1 ? Math.min(aperture, (0.999 * radius) / Math.sqrt(1 + q)) : aperture;
	const vertices = [],
		indices = [],
		rings = 40,
		sectors = 64;
	for (let i = 0; i <= rings; i++) {
		const r = (limit * i) / rings;
		for (let j = 0; j <= sectors; j++) {
			const angle = (2 * Math.PI * j) / sectors;
			vertices.push(
				r * Math.cos(angle),
				r * Math.sin(angle),
				apexZ - sag(r, radius, q),
			);
		}
	}
	for (let i = 0; i < rings; i++)
		for (let j = 0; j < sectors; j++) {
			const a = i * (sectors + 1) + j,
				b = a + sectors + 1;
			indices.push(a, b, a + 1, b, b + 1, a + 1);
		}
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute(
		"position",
		new THREE.Float32BufferAttribute(vertices, 3),
	);
	geometry.setIndex(indices);
	geometry.computeVertexNormals();
	return geometry;
}
function mesh(geometry, color, wireframe = false) {
	const material = new THREE.MeshStandardMaterial({
		color,
		wireframe,
		side: THREE.DoubleSide,
		roughness: 0.18,
		transparent: !wireframe,
		opacity: wireframe ? 1 : 0.42,
		depthWrite: wireframe,
	});
	const result = new THREE.Mesh(geometry, material);
	model.add(result);
	return result;
}
const lessons = [
	"Camera (15, 10, 30), looking at (0, 0, −5). The coloured axes mark the future anterior corneal apex at the origin.",
	"A sphere of diameter 15.6 mm has radius 7.8 mm. Put its centre at z = −7.8 mm so its front vertex lands at z = 0.",
	"Keep the cap inside radius 5 mm. Its polar sweep is asin(5 / 7.8), then rotate +90° around x to face +z. It still belongs to the same sphere.",
	"Keep the apex at z = 0 and radius R = 7.8 mm, but set Q = −0.26. Vertices now use z = −sag(r). Change Q in the code and compare the edge profile.",
	"Add a posterior cap with R = 6.5 mm and Q = 0, shifted to z = −0.55 mm. CCT is the separation of the vertices, not the thickness everywhere.",
	"Turn off wireframe, compute normals and add translucent materials. Colour and opacity help us see the two surfaces; these choices do not calculate ocular optics.",
	"Place the iris, a flattened-sphere lens and a retinal cup on the same axis. Internal ACD = 3.52 mm, lens thickness = 3.60 mm, anterior apex to posterior endpoint = 24.30 mm. These are chosen dimensions.",
];

function disposeModel() {
	for (const child of [...model.children]) {
		child.geometry.dispose();
		child.material.dispose();
		model.remove(child);
	}
}
function build(step) {
	disposeModel();
	orbit.enableDamping = false;
	orbit.update();
	camera.position.set(
		step === 6 ? 33 : 15,
		step === 6 ? 16 : 10,
		step === 6 ? 12 : 30,
	);
	orbit.target.set(0, 0, step === 6 ? -8 : -5);
	orbit.update();
	orbit.enableDamping = true;
	if (step === 1 || step === 2) {
		// 1 → 2. The same radius and centre; only the polar sweep changes.
		const sphere = new THREE.SphereGeometry(
			R,
			64,
			40,
			0,
			2 * Math.PI,
			0,
			step === 1 ? Math.PI : Math.asin(aperture / R),
		);
		const cap = mesh(sphere, 0x78c9dc, true);
		cap.rotation.x = Math.PI / 2;
		cap.position.z = -R;
	}
	if (step >= 3) mesh(conic(R, Q, 0), 0x78c9dc, step < 5);
	// 4 → 5. Add a second surface, then change its rendering material.
	if (step >= 4) mesh(conic(6.5, 0, -cct), 0xe8c875, step < 5);
	if (step === 6) {
		// 6. Every position is derived from declared endpoints, in the same units.
		const internalACD = 3.52,
			lensThickness = 3.6,
			axialEndpoint = 24.3;
		const iris = mesh(new THREE.RingGeometry(2, 5.5, 64), 0x739781);
		iris.position.z = -3.5;
		const lens = mesh(new THREE.SphereGeometry(4.5, 48, 24), 0xeadb97);
		lens.scale.z = lensThickness / 9;
		lens.position.z = -(cct + internalACD + lensThickness / 2);
		const cup = mesh(
			new THREE.SphereGeometry(12, 48, 24, 0, 2 * Math.PI, 0, Math.PI / 2),
			0xd58e78,
		);
		cup.rotation.x = -Math.PI / 2;
		cup.position.z = 12 - axialEndpoint;
	}
	document.querySelector("#lesson").textContent = lessons[step];
	invalidate();
}

// Draw after a change and while orbit damping settles; no permanent render loop.
let frame = 0;
function invalidate() {
	if (!frame && !document.hidden) frame = requestAnimationFrame(draw);
}
function draw() {
	const moving = orbit.update();
	renderer.render(scene, camera);
	frame = 0;
	if (moving) invalidate();
}
const resize = new ResizeObserver(() => {
	renderer.setSize(mount.clientWidth, mount.clientHeight);
	camera.aspect = mount.clientWidth / mount.clientHeight;
	camera.updateProjectionMatrix();
	invalidate();
});
resize.observe(mount);
orbit.addEventListener("change", invalidate);
document.addEventListener("visibilitychange", invalidate);
document
	.querySelector("#step")
	.addEventListener("change", (e) => build(Number(e.target.value)));
build(0);
window.addEventListener("pagehide", (event) => {
	if (event.persisted) return;
	cancelAnimationFrame(frame);
	resize.disconnect();
	orbit.dispose();
	disposeModel();
	axes.geometry.dispose();
	for (const material of [axes.material].flat()) material.dispose();
	renderer.dispose();
});
