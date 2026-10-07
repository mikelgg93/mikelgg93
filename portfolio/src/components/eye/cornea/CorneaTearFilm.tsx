import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { disposeThree } from "../disposeThree";
import { observeThreeResize } from "../threeResize";

const vertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
  vPosition = modelViewPosition.xyz;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewPosition;
}
`;

const fragmentShader = `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

uniform float uTime;

// Simplex noise for organic thickness variation
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec3 viewDir = normalize(-vPosition);
  float cosTheta = clamp(dot(normalize(vNormal), viewDir), 0.0, 1.0);

  // Base corneal color (slight bluish/white reflection)
  vec3 baseColor = vec3(0.1, 0.15, 0.2);

  // Fresnel effect for strong edge reflections
  float fresnel = pow(1.0 - cosTheta, 3.0);

  // Lipid layer thickness variation using noise and time (simulate blinking/spreading)
  float noiseVal = snoise(vUv * 3.0 + vec2(0.0, -uTime * 0.1));
  float thickness = 70.0 + 30.0 * clamp(noiseVal, -1.0, 1.0); // 40–100 nm

  // Simplified RGB interference visualisation, not a spectral thin-film calculation.
  // The path difference relies on viewing angle and thickness
  float n_lipid = 1.48; // Refractive index of lipid layer

  float pathDiff = 2.0 * n_lipid * thickness * cos(asin(sin(acos(cosTheta))/n_lipid));

  // Calculate interference colors for RGB wavelengths
  // Wavelengths in nm: R=650, G=510, B=450
  vec3 lambda = vec3(650.0, 510.0, 450.0);

  // Phase shift: half a wavelength shift occurs at the air-lipid boundary
  vec3 phase = (pathDiff / lambda) + 0.5;

  // Intensity varies as cos^2 of the phase
  vec3 interference = cos(phase * 3.14159) * cos(phase * 3.14159);

  // Mix interference color with the base fresnel reflection
  vec3 finalColor = mix(baseColor, interference * 1.5, fresnel * 0.8);

  // Add a specular highlight
  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
  vec3 halfVector = normalize(lightDir + viewDir);
  float specular = pow(max(dot(vNormal, halfVector), 0.0), 100.0);
  finalColor += vec3(1.0) * specular * 1.0;

  // Soft transparency
  float alpha = mix(0.3, 0.9, fresnel);

  gl_FragColor = vec4(finalColor, alpha);
}
`;

export default function CorneaTearFilm() {
	const mountRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!mountRef.current) return;

		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
		camera.position.set(0, 0, 3.5);

		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setClearColor(0x000000, 0);
		mountRef.current.appendChild(renderer.domElement);

		const orbit = new OrbitControls(camera, renderer.domElement);
		orbit.enableDamping = true;
		orbit.dampingFactor = 0.05;
		orbit.enableZoom = false;

		// Create the Cornea Geometry
		const geometry = new THREE.SphereGeometry(
			1.0,
			64,
			64,
			0,
			Math.PI * 2,
			0,
			Math.PI / 3,
		);

		const material = new THREE.ShaderMaterial({
			vertexShader,
			fragmentShader,
			uniforms: {
				uTime: { value: 0.0 },
			},
			transparent: true,
			side: THREE.DoubleSide,
			depthWrite: false,
		});

		const corneaMesh = new THREE.Mesh(geometry, material);
		corneaMesh.rotation.x = Math.PI / 2;
		scene.add(corneaMesh);

		let animationFrameId: number;
		const clock = new THREE.Clock();

		const animate = () => {
			animationFrameId = requestAnimationFrame(animate);
			material.uniforms.uTime!.value = clock.getElapsedTime();

			// Gentle rotation to show off the interference pattern
			corneaMesh.rotation.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.2;
			corneaMesh.rotation.z = Math.cos(clock.getElapsedTime() * 0.3) * 0.1;

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

		const resizeObserver = observeThreeResize(
			mountRef.current,
			renderer,
			camera,
		);

		return () => {
			cancelAnimationFrame(animationFrameId);
			resizeObserver.disconnect();
			if (mountRef.current && renderer.domElement.parentNode) {
				mountRef.current.removeChild(renderer.domElement);
			}
			orbit.dispose();
			disposeThree(scene);
			renderer.dispose();
		};
	}, []);

	return (
		<div className="relative w-full h-[500px] bg-transparent overflow-hidden rounded-lg group">
			<div className="absolute top-4 left-4 z-10 flex flex-col items-start gap-1 pointer-events-none bg-card/80 backdrop-blur-md border border-border p-3 rounded-xl shadow-lg">
				<span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1 border-b border-border/50 pb-1 w-full text-center">
					Tear Film: Thin Film Interference
				</span>
				<div className="text-xs text-foreground max-w-[200px]">
					A wafer-thin oil layer floating on the watery tears. As its thickness
					drifts, different colors cancel and reinforce, giving the faint
					oil-slick sheen.
				</div>
			</div>

			<div
				ref={mountRef}
				className="absolute inset-0 cursor-grab active:cursor-grabbing"
			/>
		</div>
	);
}
