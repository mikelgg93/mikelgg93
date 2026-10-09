import * as THREE from "three";
import { ciliaryPoint, deformCiliary, muscleGeometry } from "./ciliaryGeometry";
import { clearLensMaterial } from "./lensMaterial";
import { lensShape } from "./lensModel";
import { createLensGeometry } from "./lensScene";

// A continuous, rounded muscle body. Coordinates and bundle texture are
// illustrative; smooth muscle does not have skeletal-muscle striations.
const contour = new THREE.CatmullRomCurve3(
	[
		[7.04, 0, 1.02],
		[7.1, 0, 0.55],
		[7.08, 0, -2.55],
		[6.97, 0, -2.7],
		[6.63, 0, -1.95],
		[6.2, 0, -0.8],
		[5.86, 0, -0.22],
		[5.85, 0, 0.42],
		[6.02, 0, 0.88],
		[6.52, 0, 1.08],
	].map(([r, y, z]) => new THREE.Vector3(r, y, z)),
	true,
	"centripetal",
);
export const CILIARY_PROFILE = contour
	.getPoints(64)
	.map((p) => [p.x, p.z] as const);

// Shallow, irregular relief follows the long bundles instead of crossing them.
// This is a drawing detail, not a measurement of individual muscle cells.
function bundleRelief(r: number, angle: number, z: number) {
	const outer = THREE.MathUtils.smoothstep(r, 6.2, 6.85);
	return (
		outer *
		(0.018 * Math.sin(angle * 29 + z * 0.9 + Math.sin(angle * 7)) +
			0.011 * Math.sin(angle * 17 - z * 0.65))
	);
}

function tissueMaterial() {
	const material = new THREE.MeshPhongMaterial({
		color: 0xffffff,
		vertexColors: true,
		specular: 0x543538,
		shininess: 24,
		side: THREE.DoubleSide,
	});
	material.onBeforeCompile = (shader) => {
		shader.vertexShader =
			`varying vec3 tissuePoint;\n${shader.vertexShader}`.replace(
				"#include <begin_vertex>",
				"#include <begin_vertex>\ntissuePoint = position;",
			);
		shader.fragmentShader = `varying vec3 tissuePoint;
  float tissueHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float tissueNoise(vec2 p) { vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f);
   return mix(mix(tissueHash(i),tissueHash(i+vec2(1,0)),f.x),
    mix(tissueHash(i+vec2(0,1)),tissueHash(i+vec2(1,1)),f.x),f.y); }
  ${shader.fragmentShader}`.replace(
			"#include <color_fragment>",
			`#include <color_fragment>
   float r=length(tissuePoint.xy), a=atan(tissuePoint.y,tissuePoint.x);
   float outer=smoothstep(6.15,6.85,r);
   // Irregular elongated grain suggests bundles, with no transverse stripes.
   float longitudinal=tissueNoise(vec2(a*95.0 + sin(tissuePoint.z*1.3),tissuePoint.z*1.6));
   float circular=tissueNoise(vec2(a*3.0,tissuePoint.z*43.0 + sin(a*5.0)));
   float grain=mix(circular,longitudinal,outer);
   diffuseColor.rgb *= 0.78 + 0.28*grain;
  `,
		);
		shader.fragmentShader = shader.fragmentShader.replace(
			"#include <normal_fragment_maps>",
			`#include <normal_fragment_maps>
   // A small surface-gradient bump gives the bundles depth as the eye rotates.
   float tissueHeight=0.018*grain;
   vec3 sx=dFdx(-vViewPosition), sy=dFdy(-vViewPosition);
   vec3 tx=cross(sy,normal), ty=cross(normal,sx);
   float determinant=dot(sx,tx);
   vec3 heightGradient=sign(determinant)*(dFdx(tissueHeight)*tx+dFdy(tissueHeight)*ty);
   normal=normalize(abs(determinant)*normal-heightGradient);
  `,
		);
	};
	return material;
}

export function createCiliaryApparatus() {
	const group = new THREE.Group();
	const support = new THREE.Group();
	group.add(support);
	const muscle = muscleGeometry(CILIARY_PROFILE);
	const surface = muscle.getAttribute("position");
	for (let i = 0; i < surface.count; i++) {
		const r = Math.hypot(surface.getX(i), surface.getY(i));
		const a = Math.atan2(surface.getY(i), surface.getX(i));
		const radius = r + bundleRelief(r, a, surface.getZ(i));
		surface.setXYZ(
			i,
			radius * Math.cos(a),
			radius * Math.sin(a),
			surface.getZ(i),
		);
	}
	muscle.computeVertexNormals();
	const rest = new Float32Array(muscle.getAttribute("position").array);
	muscle.setAttribute(
		"color",
		new THREE.Float32BufferAttribute(new Float32Array(rest.length), 3),
	);
	const material = tissueMaterial();
	support.add(new THREE.Mesh(muscle, material));
	const tissues = [{ geometry: muscle, rest }];
	const section = new THREE.Group();
	const profile = new THREE.Shape(
		CILIARY_PROFILE.map(([r, z]) => new THREE.Vector2(r, z)),
	);
	for (const side of [-1, 1]) {
		const geometry = new THREE.ShapeGeometry(profile);
		const p = geometry.getAttribute("position");
		for (let i = 0; i < p.count; i++) {
			const r = p.getX(i),
				z = p.getY(i);
			p.setXYZ(
				i,
				side * (r + bundleRelief(r, side > 0 ? 0 : Math.PI, z)),
				0.006,
				z,
			);
		}
		geometry.computeVertexNormals();
		geometry.setAttribute(
			"color",
			new THREE.Float32BufferAttribute(new Float32Array(p.count * 3), 3),
		);
		const cap = new THREE.Mesh(geometry, material.clone());
		// Match the flesh shading, with the section carrying broad region colours.
		cap.material.onBeforeCompile = material.onBeforeCompile;
		section.add(cap);
		tissues.push({ geometry, rest: new Float32Array(p.array) });
	}
	support.add(section);
	const shape = createLensGeometry();
	const lens = new THREE.Group();
	const shell = clearLensMaterial();
	lens.add(new THREE.Mesh(shape, shell));
	const rim = new THREE.LineLoop(
		new THREE.BufferGeometry().setFromPoints(
			Array.from(
				{ length: 128 },
				(_, i) =>
					new THREE.Vector3(
						Math.cos((i * Math.PI) / 64),
						Math.sin((i * Math.PI) / 64),
						0,
					),
			),
		),
		new THREE.LineBasicMaterial({
			color: 0xe6e6ca,
			transparent: true,
			opacity: 0.5,
		}),
	);
	lens.add(rim);
	group.add(lens);
	const folds = new THREE.InstancedMesh(
		new THREE.SphereGeometry(1, 20, 12),
		new THREE.MeshPhongMaterial({ color: 0x6e4137, shininess: 18 }),
		56,
	);
	const transform = new THREE.Object3D();
	support.add(folds);
	const zonuleGeometry = new THREE.BufferGeometry();
	const zonules = new THREE.Float32BufferAttribute(
		new Float32Array(56 * 3 * 4 * 3),
		3,
	);
	zonuleGeometry.setAttribute("position", zonules);
	const zonuleMaterial = new THREE.LineBasicMaterial({
		color: 0xe8d7ae,
		transparent: true,
		opacity: 0.58,
	});
	support.add(new THREE.LineSegments(zonuleGeometry, zonuleMaterial));
	const clipped = [
		material,
		shell,
		rim.material,
		folds.material,
		zonuleMaterial,
	];
	const plane = [new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)];
	let lastAccommodation = -1,
		lastCutaway: boolean | undefined,
		lastMap: boolean | undefined;
	function update(accommodation: number, cutaway: boolean, map: boolean) {
		const s = lensShape(accommodation);
		if (accommodation !== lastAccommodation) {
			for (const t of tissues) deformCiliary(t.geometry, t.rest, s.fraction);
			lens.scale.set(s.lensRadius, s.lensRadius, s.thickness / 2);
			for (let i = 0; i < 56; i++) {
				const angle = (i * Math.PI * 2) / 56;
				transform.position.copy(ciliaryPoint(5.85, angle, 0.05, s.fraction));
				transform.rotation.z = angle;
				transform.scale.set(
					0.47 + 0.04 * Math.sin(i * 2.7),
					0.085,
					0.26 + 0.035 * Math.sin(i * 1.9),
				);
				transform.updateMatrix();
				folds.setMatrixAt(i, transform.matrix);
			}
			folds.instanceMatrix.needsUpdate = true;
			folds.computeBoundingSphere();
			let k = 0;
			for (let i = 0; i < 56; i++)
				for (const side of [-1, 0, 1]) {
					const angle = ((i + 0.5) * Math.PI * 2) / 56;
					const a = side === 0 ? 1 : 0.96;
					const end = new THREE.Vector3(
						s.lensRadius * a * Math.cos(angle),
						s.lensRadius * a * Math.sin(angle),
						((side * s.thickness) / 2) *
							(side > 0 ? 0.85 : 1.15) *
							Math.sqrt(1 - a * a),
					);
					const origin = ciliaryPoint(6.58, angle, -1.95, s.fraction);
					const guide = ciliaryPoint(5.72, angle, -0.32, s.fraction);
					for (const p of [origin, guide, guide, end])
						zonules.setXYZ(k++, p.x, p.y, p.z);
				}
			zonules.needsUpdate = true;
			zonuleGeometry.computeBoundingSphere();
			lastAccommodation = accommodation;
		}
		if (map !== lastMap) {
			const outer = new THREE.Color(map ? 0x995d7a : 0xb47b7c);
			const middle = new THREE.Color(map ? 0xc58b56 : 0xbb8380);
			const inner = new THREE.Color(map ? 0xe8a28a : 0xa9696d);
			const color = new THREE.Color();
			for (const t of tissues) {
				const colors = t.geometry.getAttribute("color");
				for (let i = 0; i < colors.count; i++) {
					const r = Math.hypot(t.rest[i * 3]!, t.rest[i * 3 + 1]!);
					if (r > 6.55)
						color
							.copy(middle)
							.lerp(outer, THREE.MathUtils.smoothstep(r, 6.55, 7.1));
					else
						color
							.copy(inner)
							.lerp(middle, THREE.MathUtils.smoothstep(r, 5.85, 6.55));
					colors.setXYZ(i, color.r, color.g, color.b);
				}
				colors.needsUpdate = true;
			}
			lastMap = map;
		}
		if (cutaway !== lastCutaway) {
			for (const m of clipped) {
				m.clippingPlanes = cutaway ? plane : [];
				m.needsUpdate = true;
			}
			section.visible = cutaway;
			lastCutaway = cutaway;
		}
		return s;
	}
	return { group, support, lens, update };
}
