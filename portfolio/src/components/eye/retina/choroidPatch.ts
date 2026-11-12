import * as THREE from "three";
import { CHOROID_WALL, RETINAL_WALL } from "./retinaAnatomy";
import { CUP_CENTRE_Z, CUP_RADIUS } from "./retinaModel";

// A magnified posterior patch: procedural vessel routes and calibres, not a scan.
// The three vascular compartments are shown, without resolving capillary walls.
export function createChoroidPatch() {
	const group = new THREE.Group();
	const radius = CUP_RADIUS + RETINAL_WALL;
	const point = (x: number, y: number, depth: number) =>
		new THREE.Vector3(
			x,
			y,
			CUP_CENTRE_Z - Math.sqrt((radius + depth) ** 2 - x * x - y * y),
		);
	function sheet(depth: number, colour: number, opacity = 1) {
		const geometry = new THREE.PlaneGeometry(10, 8, 40, 32);
		const p = geometry.getAttribute("position");
		for (let i = 0; i < p.count; i++)
			p.setXYZ(i, ...point(p.getX(i), p.getY(i), depth).toArray());
		geometry.computeVertexNormals();
		const material = new THREE.MeshStandardMaterial({
			color: colour,
			roughness: 0.95,
			side: THREE.DoubleSide,
			transparent: opacity < 1,
			opacity,
			depthWrite: opacity === 1,
		});
		const mesh = new THREE.Mesh(geometry, material);
		group.add(mesh);
		return mesh;
	}
	sheet(CHOROID_WALL, 0x492c28);
	const large = new THREE.MeshStandardMaterial({
		color: 0x8b3030,
		roughness: 0.8,
	});
	const small = new THREE.MeshStandardMaterial({
		color: 0xbe5549,
		roughness: 0.8,
	});
	function vessel(
		points: [number, number][],
		depth: number,
		calibre: number,
		material: THREE.Material,
	) {
		const route = new THREE.CatmullRomCurve3(
			points.map(([x, y]) => point(x, y, depth)),
		);
		const mesh = new THREE.Mesh(
			new THREE.TubeGeometry(route, 32, calibre, 6, false),
			material,
		);
		group.add(mesh);
	}
	const routes: [number, number][][] = [
		[
			[-4.8, -2.7],
			[-3, -2],
			[-1.2, -1.4],
			[1, -1],
			[4.8, -0.5],
		],
		[
			[-1.2, -1.4],
			[-0.5, -2.5],
			[1, -3.3],
			[3.8, -3.7],
		],
		[
			[1, -1],
			[2, 0.2],
			[3.6, 0.8],
			[4.8, 2.2],
		],
		[
			[-4.8, 2.7],
			[-3.1, 2.3],
			[-1.5, 1.2],
			[0.6, 0.9],
			[4.8, 3.3],
		],
		[
			[-1.5, 1.2],
			[-0.4, -0.1],
			[1.5, -0.1],
			[3.2, 0],
		],
	];
	for (const [index, route] of routes.entries()) {
		vessel(route, 0.28, 0.105 - index * 0.006, large);
		const path = new THREE.CatmullRomCurve3(
			route.map(([x, y]) => new THREE.Vector3(x, y, 0)),
		);
		for (let i = 1; i <= 4; i++) {
			const start = path.getPoint(i / 5),
				sign = (i + index) % 2 ? 1 : -1;
			const endX = THREE.MathUtils.clamp(
				start.x + 0.8 + 0.3 * Math.sin(index + i),
				-4.6,
				4.6,
			);
			const endY = THREE.MathUtils.clamp(
				start.y + sign * (0.7 + 0.4 * Math.cos(i * 2)),
				-3.7,
				3.7,
			);
			vessel(
				[
					[start.x, start.y],
					[start.x + 0.15, start.y + sign * 0.4],
					[endX, endY],
				],
				0.14,
				0.035 + 0.004 * (i % 2),
				small,
			);
		}
	}
	// A reticular sheet represents the choriocapillaris, not individual resolved capillaries.
	const capillaryMaterial = new THREE.LineBasicMaterial({
		color: 0xe5a18a,
		transparent: true,
		opacity: 0.24,
	});
	const segments: number[] = [];
	const edge = 0.22,
		dx = Math.sqrt(3) * edge;
	function capPoint(x: number, y: number) {
		return point(
			x + 0.025 * Math.sin(x * 19 + y * 7),
			y + 0.025 * Math.cos(x * 11 - y * 17),
			0.025,
		);
	}
	for (let row = -10; row <= 10; row++)
		for (let col = -12; col <= 12; col++) {
			const x = col * dx + ((row & 1) * dx) / 2,
				y = row * 1.5 * edge;
			for (let k = 0; k < 6; k++) {
				const a = Math.PI / 6 + (k * Math.PI) / 3,
					b = a + Math.PI / 3;
				const x1 = x + edge * Math.cos(a),
					y1 = y + edge * Math.sin(a),
					x2 = x + edge * Math.cos(b),
					y2 = y + edge * Math.sin(b);
				if (
					Math.max(Math.abs(x1), Math.abs(x2)) > 4.8 ||
					Math.max(Math.abs(y1), Math.abs(y2)) > 3.8
				)
					continue;
				segments.push(
					...capPoint(x1, y1).toArray(),
					...capPoint(x2, y2).toArray(),
				);
			}
		}
	const network = new THREE.LineSegments(
		new THREE.BufferGeometry().setFromPoints(
			Array.from({ length: segments.length / 3 }, (_, i) =>
				new THREE.Vector3().fromArray(segments, i * 3),
			),
		),
		capillaryMaterial,
	);
	group.add(network);
	const cover = sheet(-0.015, 0xa34c28, 0.78);
	cover.renderOrder = 5;
	return {
		group,
		update(tessellated: boolean) {
			cover.visible = tessellated;
			network.visible = !tessellated;
		},
	};
}
