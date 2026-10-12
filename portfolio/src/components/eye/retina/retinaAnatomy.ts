import * as THREE from "three";
import {
	CORNEAL_APEX_Z,
	LENS_FRONT_FACTOR,
	POSTERIOR_CORNEAL_APEX_Z,
	RELAXED_LENS_THICKNESS,
} from "../eyeDimensions";
import { CUP_CENTRE_Z, CUP_RADIUS } from "./retinaModel";

// Chosen geometry in mm. The RPE is represented by the outer retinal boundary.
export const RETINAL_WALL = 0.3;
export const CHOROID_WALL = 0.4;
export const SCLERAL_WALL = 0.7;
export const PIT_DEPTH = 0.1;
export const PIT_WIDTH = 0.65;
export const MACULA_RADIUS = 2.75;
export const DISC_ANGLE = 0.39; // ~4.7 mm surface distance from the fovea
export const CANAL_ANGLE = Math.asin(1.05 / CUP_RADIUS); // enlarged disc opening
export const biometry = {
	cct: CORNEAL_APEX_Z - POSTERIOR_CORNEAL_APEX_Z,
	acd:
		POSTERIOR_CORNEAL_APEX_Z - (RELAXED_LENS_THICKNESS * LENS_FRONT_FACTOR) / 2,
	lt: RELAXED_LENS_THICKNESS,
	axl: CORNEAL_APEX_Z - (CUP_CENTRE_Z - CUP_RADIUS - RETINAL_WALL),
};
export function innerRetinalRadius(direction: THREE.Vector3) {
	const distance =
		CUP_RADIUS * Math.acos(THREE.MathUtils.clamp(-direction.z, -1, 1));
	return CUP_RADIUS + PIT_DEPTH * Math.exp(-((distance / PIT_WIDTH) ** 2));
}
// A point on the SAME inner surface used by the coat mesh, then lifted into
// the vitreous for vessel tubes. Iteration accounts for the radial pit profile.
export function retinalPoint(x: number, y: number, lift = 0) {
	let radius = CUP_RADIUS;
	for (let i = 0; i < 8; i++) {
		const direction = new THREE.Vector3(
			x,
			y,
			-Math.sqrt(radius * radius - x * x - y * y),
		).divideScalar(radius);
		radius = innerRetinalRadius(direction);
	}
	return new THREE.Vector3(
		x,
		y,
		CUP_CENTRE_Z - Math.sqrt(radius * radius - x * x - y * y) + lift,
	);
}
export const retinalLandmarks = [
	{ en: "Foveal pit", es: "Fosita foveal", point: retinalPoint(0, 0) },
	{ en: "Macula", es: "Mácula", point: retinalPoint(-1.8, -0.8) },
	{
		en: "Optic disc · nasal",
		es: "Papila · nasal",
		point: new THREE.Vector3(
			CUP_RADIUS * Math.sin(DISC_ANGLE),
			0,
			CUP_CENTRE_Z - CUP_RADIUS * Math.cos(DISC_ANGLE),
		),
	},
] as const;

// Original stylised major vessels: superior/inferior arcades leave the disc
// and curve around the central avascular region. No capillary/density model.
export function vesselPaths() {
	const discX = CUP_RADIUS * Math.sin(DISC_ANGLE);
	const paths: { points: THREE.Vector2[]; radius: number; artery: boolean }[] =
		[];
	for (const sign of [-1, 1]) {
		for (const artery of [true, false]) {
			const shift = artery ? 0 : 0.3;
			paths.push({
				radius: artery ? 0.035 : 0.05,
				artery,
				points: [
					[discX, sign * (0.12 + shift)],
					[3.4, sign * (1.2 + shift)],
					[1.6, sign * (2.6 + shift)],
					[-1.2, sign * (3.2 + shift)],
					[-4.2, sign * (2.7 + shift)],
					[-6.4, sign * (2 + shift)],
				].map(([x, y]) => new THREE.Vector2(x, y)),
			});
			paths.push({
				radius: artery ? 0.025 : 0.035,
				artery,
				points: [
					[discX, sign * (0.12 + shift)],
					[5.6, sign * (1.4 + shift)],
					[6.6, sign * (3 + shift)],
					[6.5, sign * (5 + shift)],
				].map(([x, y]) => new THREE.Vector2(x, y)),
			});
		}
		for (const [x, y, dx, dy] of [
			[1.6, 2.6, 0.7, 5.7],
			[-1.2, 3.2, -2.3, 6.2],
			[-4.2, 2.7, -6.2, 4.8],
		] as const)
			paths.push({
				radius: 0.023,
				artery: true,
				points: [
					new THREE.Vector2(x, sign * y),
					new THREE.Vector2((x + dx) / 2, (sign * (y + dy)) / 2),
					new THREE.Vector2(dx, sign * dy),
				],
			});
	}
	return paths;
}
export class RetinalVesselCurve extends THREE.Curve<THREE.Vector3> {
	private route: THREE.SplineCurve;
	constructor(
		points: THREE.Vector2[],
		private lift: number,
	) {
		super();
		this.route = new THREE.SplineCurve(points);
	}
	override getPoint(t: number, target = new THREE.Vector3()) {
		const p = this.route.getPoint(t);
		return target.copy(retinalPoint(p.x, p.y, this.lift));
	}
}
export function createRetinalVessels() {
	const group = new THREE.Group();
	group.name = "retinal-vessels";
	const artery = new THREE.MeshPhongMaterial({
		color: "#a9332d",
		shininess: 30,
	});
	const vein = new THREE.MeshPhongMaterial({ color: "#682b36", shininess: 24 });
	for (const path of vesselPaths()) {
		const curve = new RetinalVesselCurve(path.points, path.radius + 0.008);
		group.add(
			new THREE.Mesh(
				new THREE.TubeGeometry(curve, 80, path.radius, 6, false),
				path.artery ? artery : vein,
			),
		);
	}
	return group;
}
