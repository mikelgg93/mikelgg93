import * as THREE from "three";
import { anteriorCoatRadius, OUTER_LIMBUS_Z } from "./globeProfile";

// Original, deterministic drawing of superficial anterior ocular vessels. These
// stand for conjunctival/episcleral vessels, not retinal or choroidal vasculature.
// No measured calibre, clinical redness score or conjunctival histology is implied.
export function surfacePoint(z: number, angle: number) {
	const r = anteriorCoatRadius("sclera", 1, z) + 0.018;
	return new THREE.Vector3(r * Math.cos(angle), r * Math.sin(angle), z);
}
class SurfaceVessel extends THREE.Curve<THREE.Vector3> {
	constructor(
		private z0: number,
		private z1: number,
		private angle: number,
		private bend: number,
	) {
		super();
	}
	override getPoint(t: number, target = new THREE.Vector3()) {
		return target.copy(
			surfacePoint(
				THREE.MathUtils.lerp(this.z0, this.z1, t),
				this.angle + this.bend * t + 0.018 * Math.sin(t * Math.PI * 3),
			),
		);
	}
}
export function createOcularSurface() {
	const group = new THREE.Group();
	group.name = "superficial-ocular-vessels";
	const material = new THREE.MeshStandardMaterial({
		color: "#a96c68",
		transparent: true,
		opacity: 0.42,
		roughness: 0.7,
		depthWrite: false,
	});
	for (let i = 0; i < 18; i++) {
		const angle = (i * Math.PI * 2) / 18 + 0.07 * Math.sin(i * 3.7),
			end = OUTER_LIMBUS_Z - 0.3 - (0.5 + 0.5 * Math.sin(i * 2.3)) * 2.2;
		const trunk = new SurfaceVessel(
			-4.8 + 0.4 * Math.sin(i),
			end,
			angle,
			0.06 * Math.sin(i * 1.7),
		);
		group.add(
			new THREE.Mesh(
				new THREE.TubeGeometry(
					trunk,
					32,
					0.018 + 0.007 * (0.5 + 0.5 * Math.sin(i * 4)),
					5,
					false,
				),
				material,
			),
		);
		// Daughter begins on the parent, so branches never float apart from it.
		const t = 0.45,
			z = THREE.MathUtils.lerp(-4.8 + 0.4 * Math.sin(i), end, t),
			p = trunk.getPoint(t),
			a = Math.atan2(p.y, p.x);
		group.add(
			new THREE.Mesh(
				new THREE.TubeGeometry(
					new SurfaceVessel(z, end - 0.35, a, i % 2 ? 0.08 : -0.08),
					20,
					0.011,
					5,
					false,
				),
				material,
			),
		);
	}
	return group;
}
export function scleralMaterial() {
	const m = new THREE.MeshPhysicalMaterial({
		color: "#eee8df",
		roughness: 0.62,
		clearcoat: 0.12,
		clearcoatRoughness: 0.3,
		envMapIntensity: 0.2,
	});
	m.onBeforeCompile = (shader) => {
		shader.vertexShader =
			`varying vec3 coatPoint;\n${shader.vertexShader}`.replace(
				"#include <begin_vertex>",
				"#include <begin_vertex>\ncoatPoint=transformed;",
			);
		shader.fragmentShader =
			`varying vec3 coatPoint;\n${shader.fragmentShader}`.replace(
				"#include <color_fragment>",
				`#include <color_fragment>
 float grain=sin(coatPoint.x*15.0+sin(coatPoint.y*9.0))*sin(coatPoint.z*12.0);
 diffuseColor.rgb*=.993+.007*grain;`,
			);
	};
	m.customProgramCacheKey = () => "scleral-ivory-v1";
	return m;
}
