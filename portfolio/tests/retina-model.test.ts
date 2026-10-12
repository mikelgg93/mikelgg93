import { expect, test } from "bun:test";
import {
	createRetinalCup,
	updateRetinalCup,
} from "../src/components/eye/retina/retinaGeometry";
import {
	CUP_CENTRE_Z,
	CUP_RADIUS,
	cupPoint,
	layerBounds,
	receptorMosaic,
	samplingModel,
} from "../src/components/eye/retina/retinaModel";

test("retinal cup stays spherical at completion and reuses finite mesh buffers throughout construction", () => {
	const geometry = createRetinalCup(),
		positions = geometry.getAttribute("position");
	for (const value of [NaN, -1, 0, 0.5, 1, 2]) {
		updateRetinalCup(geometry, value);
		expect(geometry.getAttribute("position")).toBe(positions);
		expect([...positions.array].every(Number.isFinite)).toBe(true);
		expect(
			[...geometry.getAttribute("normal").array].every(Number.isFinite),
		).toBe(true);
	}
	for (const u of [0, 0.2, 0.7, 1])
		for (const a of [0, Math.PI / 2, Math.PI]) {
			const [x, y, z] = cupPoint(u, a, 1);
			expect(Math.hypot(x, y, z - CUP_CENTRE_Z)).toBeCloseTo(CUP_RADIUS, 10);
		}
	expect(cupPoint(0, 0, 1)[2]).toBeCloseTo(-18.4, 10);
	geometry.dispose();
});
test("layer profiles never cross, and foveal centre retains the outer bands", () => {
	for (const pit of [false, true])
		for (const separated of [false, true])
			for (let i = 0; i <= 100; i++) {
				const bands = layerBounds(-1 + i / 50, pit, separated);
				for (let j = 0; j < bands.length; j++) {
					expect(bands[j]!.top).toBeLessThanOrEqual(bands[j]!.bottom);
					if (j)
						expect(bands[j]!.top).toBeGreaterThanOrEqual(
							bands[j - 1]!.bottom - 1e-10,
						);
				}
			}
	const centre = layerBounds(0, true, false);
	for (let i = 0; i < 4; i++)
		expect(centre[i]!.top).toBeCloseTo(centre[i]!.bottom, 10);
	expect(centre[5]!.bottom - centre[5]!.top).toBeGreaterThan(0);
});
test("alias alternative agrees at every receptor location including half-sample phase correction", () => {
	for (const count of [8, 16, 24, 32])
		for (const frequency of [1, 4, 7.5, 8, 12, 16, 20.5, 24])
			for (const phase of [0, Math.PI / 2, Math.PI, 2 * Math.PI]) {
				const m = samplingModel(frequency, count, phase);
				expect(Math.abs(m.alias)).toBeLessThanOrEqual(m.nyquist);
				for (const sample of m.samples) {
					expect(sample.value).toBeCloseTo(m.alternative(sample.x), 11);
					expect(sample.value).toBeGreaterThanOrEqual(0);
					expect(sample.value).toBeLessThanOrEqual(1);
				}
			}
	const m = samplingModel(NaN, Infinity, NaN);
	expect(m.samples.every((s) => Number.isFinite(s.value))).toBe(true);
});
test("the central mosaic is cone-only and both presets fit the instance allocation", () => {
	const central = receptorMosaic(true),
		outer = receptorMosaic(false);
	expect(central.rods.length).toBe(0);
	expect(outer.rods.length).toBeGreaterThan(outer.cones.length);
	expect(central.cones.length).toBeGreaterThan(outer.cones.length);
	for (const mosaic of [central, outer])
		for (const points of [mosaic.rods, mosaic.cones]) {
			expect(points.length).toBeLessThanOrEqual(441);
			expect(
				points.every(
					(p) => Number.isFinite(p.x + p.y) && Math.hypot(p.x, p.y) <= 4.7,
				),
			).toBe(true);
		}
});
