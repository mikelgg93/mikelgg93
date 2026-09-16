import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { observeThreeResize } from "../threeResize";

// A shared 3D iris scene used by every pupil demo in Part 2: a dished,
// procedurally textured iris under a glassy cornea dome, framed by the white
// sclera and lit by a studio environment. The flat two-circle shader from the
// first draft is replaced by real geometry, shading, and reflections in the
// same style as the cornea article.

export interface IrisParams {
	pupilRadius: number; // normalized radius on the iris disc (~0.08 to 0.34)
	pigmentation: number; // 0 brown, 1 hazel, 2 blue, 3 albino
	showMuscles: boolean;
	stilesCrawford: boolean;
}

export interface IrisScene {
	params: IrisParams;
	setOnFrame: (cb: ((dt: number, elapsed: number) => void) | null) => void;
	setDebug: (cb: (() => Record<string, unknown>) | null) => void;
	dispose: () => void;
}

const vertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform float uPupilRadius;
uniform int uPigmentation;
uniform bool uShowMuscles;
uniform bool uStilesCrawford;

varying vec2 vUv;
varying vec3 vNormal;

vec2 hash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float noise(in vec2 p) {
  const float K1 = 0.366025404, K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  float m = step(a.y, a.x);
  vec2 o = vec2(m, 1.0 - m);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * h * vec3(dot(a, hash(i + 0.0)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));
  return dot(n, vec3(70.0));
}
float fbm(vec2 uv) {
  float f = 0.0, w = 0.5;
  for (int i = 0; i < 5; i++) { f += w * noise(uv); uv *= 2.0; w *= 0.5; }
  return f;
}

void main() {
  vec2 center = vec2(0.5, 0.5);
  float dist = distance(vUv, center);
  float irisRadius = 0.46;
  if (dist > irisRadius) discard;

  if (dist < uPupilRadius) {
    if (uPigmentation == 3) {
      float redGlow = 0.16 + 0.10 * sin(uTime * 1.5);
      gl_FragColor = vec4(redGlow, 0.02, 0.03, 1.0);
    } else {
      gl_FragColor = vec4(0.006, 0.006, 0.01, 1.0);
    }
    return;
  }

  float radialNorm = (dist - uPupilRadius) / (irisRadius - uPupilRadius);
  float angle = atan(vUv.y - center.y, vUv.x - center.x);

  float stretch = mix(2.5, 6.0, clamp((0.35 - uPupilRadius) / 0.25, 0.0, 1.0));
  vec2 noiseUV = vec2(angle * 12.0, radialNorm * stretch);
  float n1 = fbm(noiseUV + vec2(0.0, uTime * 0.01));
  float n2 = noise(vec2(angle * 30.0, radialNorm * 15.0));
  float fibers = sin(angle * 80.0 + n1 * 4.0) * 0.5 + 0.5;
  float collarette = 0.32 + 0.08 * noise(vec2(angle * 6.0, 0.0));

  vec3 baseColor;
  if (uPigmentation == 0) {
    baseColor = mix(vec3(0.25, 0.12, 0.04), vec3(0.14, 0.06, 0.02), radialNorm) + vec3(0.12, 0.06, 0.02) * n1;
  } else if (uPigmentation == 1) {
    baseColor = mix(vec3(0.52, 0.33, 0.10), vec3(0.18, 0.38, 0.22), smoothstep(0.1, 0.6, radialNorm)) + vec3(0.15, 0.12, 0.05) * n1 * (1.0 - radialNorm);
  } else if (uPigmentation == 2) {
    baseColor = mix(vec3(0.12, 0.28, 0.48), vec3(0.28, 0.52, 0.76), radialNorm) + vec3(0.10, 0.20, 0.30) * n1;
    if (radialNorm < 0.08) baseColor = mix(vec3(0.35, 0.20, 0.08), baseColor, radialNorm / 0.08);
  } else {
    baseColor = mix(vec3(0.70, 0.30, 0.35), vec3(0.55, 0.22, 0.28), radialNorm) + vec3(0.20, 0.08, 0.10) * n1;
  }

  vec3 finalColor = baseColor * (0.75 + 0.35 * fibers) + vec3(n2 * 0.07);
  float crest = 1.0 - smoothstep(0.0, 0.03, abs(radialNorm - collarette));
  finalColor += vec3(0.12, 0.10, 0.06) * crest;
  finalColor *= smoothstep(1.0, 0.82, radialNorm);

  // Muscle map overlay: red sphincter ring near the pupil, blue radial dilator.
  if (uShowMuscles) {
    if (dist < uPupilRadius + 0.04) {
      float ring = sin(radialNorm * 120.0) * 0.5 + 0.5;
      finalColor = mix(finalColor, vec3(1.0, 0.2, 0.2), 0.55 + 0.25 * ring);
    } else {
      float spoke = sin(angle * 32.0) * 0.5 + 0.5;
      finalColor = mix(finalColor, vec3(0.2, 0.6, 1.0), 0.4 + 0.3 * spoke);
    }
  }

  // Stiles-Crawford efficiency falloff toward the pupil edge.
  if (uStilesCrawford) {
    float sc = exp(-0.085 * (dist * 24.0) * (dist * 24.0) / 4.0);
    finalColor *= mix(vec3(0.45, 0.6, 1.0), vec3(1.0), sc);
  }

  // Simple shading from the dished geometry so the iris reads as 3D.
  vec3 lightDir = normalize(vec3(-0.4, 0.6, 0.85));
  float diff = 0.7 + 0.35 * max(dot(normalize(vNormal), lightDir), 0.0);
  finalColor *= diff;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// Dished iris disc: a full disc that sinks toward the pupil, so orbiting shows
// real depth. The shader discards the pupil and the region beyond the iris.
function dishedIris() {
	const R = 1.0;
	const dish = 0.12;
	const rings = 72;
	const seg = 128;
	const v: number[] = [];
	const uv: number[] = [];
	const idx: number[] = [];
	for (let i = 0; i <= rings; i++) {
		const rr = (i / rings) * R;
		const z = -dish * (1.0 - rr / R);
		for (let j = 0; j <= seg; j++) {
			const th = (j / seg) * Math.PI * 2;
			const x = rr * Math.cos(th);
			const y = rr * Math.sin(th);
			v.push(x, y, z);
			uv.push((x / R) * 0.5 + 0.5, (y / R) * 0.5 + 0.5);
		}
	}
	for (let i = 0; i < rings; i++) {
		for (let j = 0; j < seg; j++) {
			const a = i * (seg + 1) + j;
			const b = a + 1;
			const c = (i + 1) * (seg + 1) + j;
			const d = c + 1;
			idx.push(a, b, d, a, d, c);
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
	g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
}

// Aspheric cornea cap bulging toward the camera (+Z).
function corneaCap(R: number, maxR: number, apexZ: number) {
	const c = 1 / R;
	const Q = -0.26;
	const rings = 64,
		seg = 96;
	const v: number[] = [];
	const idx: number[] = [];
	for (let i = 0; i <= rings; i++) {
		const rr = (i / rings) * maxR;
		const root = 1 - (1 + Q) * c * c * rr * rr;
		const sag = root >= 0 ? (c * rr * rr) / (1 + Math.sqrt(root)) : 0;
		for (let j = 0; j <= seg; j++) {
			const th = (j / seg) * Math.PI * 2;
			v.push(rr * Math.cos(th), rr * Math.sin(th), apexZ - sag);
		}
	}
	for (let i = 0; i < rings; i++) {
		for (let j = 0; j < seg; j++) {
			const a = i * (seg + 1) + j;
			const b = a + 1;
			const cc = (i + 1) * (seg + 1) + j;
			const d = cc + 1;
			idx.push(a, b, d, a, d, cc);
		}
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
	g.setIndex(idx);
	g.computeVertexNormals();
	return g;
}

export function createIrisScene(
	mount: HTMLDivElement,
	initial: IrisParams,
): IrisScene {
	const params: IrisParams = { ...initial };
	let onFrame: ((dt: number, elapsed: number) => void) | null = null;
	let debugCb: (() => Record<string, unknown>) | null = null;

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
	camera.position.set(0.7, 0.5, 5.2);

	const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	renderer.setClearColor(0x000000, 0);
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.1;
	mount.appendChild(renderer.domElement);

	const pmrem = new THREE.PMREMGenerator(renderer);
	const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
	scene.environment = envTex;

	const orbit = new OrbitControls(camera, renderer.domElement);
	orbit.enableDamping = true;
	orbit.dampingFactor = 0.05;
	orbit.enablePan = false;
	orbit.minDistance = 3;
	orbit.maxDistance = 9;
	orbit.target.set(0, 0, 0.1);

	scene.add(new THREE.AmbientLight(0xffffff, 0.35));
	const dir = new THREE.DirectionalLight(0xffffff, 1.6);
	dir.position.set(-3, 4, 5);
	scene.add(dir);

	// Sclera ring removed at user request.

	// Iris.
	const irisGeo = dishedIris();
	const irisMat = new THREE.ShaderMaterial({
		vertexShader,
		fragmentShader,
		uniforms: {
			uTime: { value: 0 },
			uPupilRadius: { value: params.pupilRadius },
			uPigmentation: { value: params.pigmentation },
			uShowMuscles: { value: params.showMuscles },
			uStilesCrawford: { value: params.stilesCrawford },
		},
		side: THREE.DoubleSide,
	});
	const iris = new THREE.Mesh(irisGeo, irisMat);
	scene.add(iris);

	// Glassy cornea dome over the iris.
	const corneaGeo = corneaCap(1.6, 0.95, 0.25);
	const corneaMat = new THREE.MeshPhysicalMaterial({
		transmission: 1.0,
		thickness: 0.15,
		ior: 1.376,
		roughness: 0.03,
		metalness: 0.0,
		clearcoat: 1.0,
		clearcoatRoughness: 0.03,
		transparent: true,
		envMapIntensity: 1.3,
		attenuationColor: new THREE.Color(0xeaf4ff),
		attenuationDistance: 6,
		side: THREE.DoubleSide,
	});
	const cornea = new THREE.Mesh(corneaGeo, corneaMat);
	scene.add(cornea);

	const resizeObserver = observeThreeResize(mount, renderer, camera);

	const clock = new THREE.Clock();
	let lastTime = performance.now() / 1000;
	let lastDebug = 0;
	let raf = 0;

	const animate = () => {
		raf = requestAnimationFrame(animate);
		const now = performance.now() / 1000;
		const dt = Math.min(0.1, now - lastTime);
		lastTime = now;
		const elapsed = clock.getElapsedTime();

		if (onFrame) onFrame(dt, elapsed);

		irisMat.uniforms.uTime.value = elapsed;
		irisMat.uniforms.uPupilRadius.value = params.pupilRadius;
		irisMat.uniforms.uPigmentation.value = params.pigmentation;
		irisMat.uniforms.uShowMuscles.value = params.showMuscles;
		irisMat.uniforms.uStilesCrawford.value = params.stilesCrawford;

		orbit.update();
		renderer.render(scene, camera);

		if (now - lastDebug > 0.1) {
			lastDebug = now;
			const debugEl = mount
				.closest(".interactive-viewer")
				?.querySelector(".debug-output");
			if (debugEl) {
				const payload = debugCb
					? debugCb()
					: {
							camera: {
								position: {
									x: +camera.position.x.toFixed(3),
									y: +camera.position.y.toFixed(3),
									z: +camera.position.z.toFixed(3),
								},
							},
							target: {
								x: +orbit.target.x.toFixed(3),
								y: +orbit.target.y.toFixed(3),
								z: +orbit.target.z.toFixed(3),
							},
						};
				(debugEl as HTMLElement).innerText = JSON.stringify(payload, null, 2);
			}
		}
	};
	animate();

	return {
		params,
		setOnFrame: (cb) => {
			onFrame = cb;
		},
		setDebug: (cb) => {
			debugCb = cb;
		},
		dispose: () => {
			cancelAnimationFrame(raf);
			resizeObserver.disconnect();
			if (renderer.domElement.parentNode)
				renderer.domElement.parentNode.removeChild(renderer.domElement);
			irisGeo.dispose();
			irisMat.dispose();
			corneaGeo.dispose();
			corneaMat.dispose();
			envTex.dispose();
			pmrem.dispose();
			renderer.dispose();
		},
	};
}
