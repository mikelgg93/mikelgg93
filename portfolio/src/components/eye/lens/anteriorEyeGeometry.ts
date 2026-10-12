import * as THREE from "three";
import { conicSag } from "../cornea/conic";
import { CORNEAL_APEX_Z, POSTERIOR_CORNEAL_APEX_Z } from "../eyeDimensions";
import { finiteClamp } from "./lensOptics";

// Reuse Part I's conic surface in an illustrative anterior-eye assembly (mm).
export function createAssemblyCornea() {
	const profile: THREE.Vector2[] = [];
	for (let i = 0; i <= 64; i++) {
		const r = (5.8 * i) / 64;
		profile.push(
			new THREE.Vector2(r, CORNEAL_APEX_Z - conicSag(r, 0, 7.8, 7.8, -0.26)),
		);
	}
	for (let i = 64; i >= 0; i--) {
		const r = (5.8 * i) / 64;
		profile.push(
			new THREE.Vector2(
				r,
				POSTERIOR_CORNEAL_APEX_Z - conicSag(r, 0, 6.5, 6.5, -0.4),
			),
		);
	}
	const geometry = new THREE.LatheGeometry(profile, 96);
	geometry.rotateX(Math.PI / 2);
	return geometry;
}

// A real opening, rather than a black disc: the lens can be seen through it.
export function updateAssemblyIris(
	geometry: THREE.BufferGeometry,
	diameter: number,
) {
	const inner = finiteClamp(diameter, 2, 8) / 2;
	const p = geometry.getAttribute("position");
	let k = 0;
	for (let ring = 0; ring <= 16; ring++)
		for (let j = 0; j <= 96; j++) {
			const t = ring / 16,
				r = inner + (5.6 - inner) * t,
				a = (j * Math.PI) / 48;
			p.setXYZ(k++, r * Math.cos(a), r * Math.sin(a), 2.05 + 0.18 * (1 - t));
		}
	p.needsUpdate = true;
	geometry.computeVertexNormals();
	geometry.computeBoundingSphere();
}
export function createAssemblyIris() {
	const geometry = new THREE.PlaneGeometry(1, 1, 96, 16);
	updateAssemblyIris(geometry, 4);
	return geometry;
}
export function assemblyIrisMaterial() {
	const pupil = { value: 2 };
	const material = new THREE.MeshPhongMaterial({
		color: 0x6e7145,
		side: THREE.DoubleSide,
		shininess: 12,
	});
	material.onBeforeCompile = (shader) => {
		shader.uniforms.irisPupil = pupil;
		shader.vertexShader =
			`varying vec3 irisPoint;\n${shader.vertexShader}`.replace(
				"#include <begin_vertex>",
				"#include <begin_vertex>\nirisPoint=position;",
			);
		shader.fragmentShader =
			`varying vec3 irisPoint; uniform float irisPupil;\n${shader.fragmentShader}`.replace(
				"#include <color_fragment>",
				`#include <color_fragment>
   float a=atan(irisPoint.y,irisPoint.x),r=length(irisPoint.xy);
   float t=clamp((r-irisPupil)/(5.6-irisPupil),0.0,1.0);
   float irregular=sin(a*17.0+sin(a*31.0))*0.05;
   float fibres=0.5+0.5*sin(a*173.0+sin(a*37.0)*2.0+t*5.0);
   float crypt=0.5+0.5*sin(a*41.0+sin(a*19.0));
   vec3 pigment=mix(vec3(0.24,0.13,0.055),vec3(0.20,0.25,0.14),smoothstep(0.05,0.85,t));
   float collarette=1.0-smoothstep(0.012,0.08,abs(t-0.3-irregular));
   diffuseColor.rgb=pigment*(0.7+0.5*fibres)+vec3(0.13,0.085,0.035)*collarette*crypt;
  `,
			);
	};
	return { material, pupil };
}
