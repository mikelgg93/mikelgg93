import { describe, expect, test } from "bun:test";
import {
	boundedAccommodation,
	lensShape,
	RETINA_DISTANCE,
	reducedEye,
} from "../src/components/eye/lens/lensModel";

describe("lens and accommodation models", () => {
	test("a matching response keeps paraxial focus on the fixed retina", () => {
		for (let demand = 0; demand <= 8; demand += 0.1) {
			const model = reducedEye(demand, 8);
			expect(model.residual).toBe(0);
			expect(model.focusDistance).toBeCloseTo(RETINA_DISTANCE, 12);
		}
	});

	test("limited reserve leaves near focus behind the retina, with monotonic defocus", () => {
		const model = reducedEye(4, 2); // 25 cm with only 2 D available
		expect(model.response).toBe(2);
		expect(model.residual).toBe(2);
		expect(model.focusDistance).toBeGreaterThan(RETINA_DISTANCE);
		for (let capacity = 0; capacity <= 8; capacity++) {
			let previousFocus = RETINA_DISTANCE;
			for (let demand = 0; demand <= 8; demand++) {
				const result = reducedEye(demand, capacity);
				expect(Number.isFinite(result.focusDistance)).toBe(true);
				expect(result.focusDistance).toBeGreaterThanOrEqual(previousFocus);
				expect(result.response).toBeLessThanOrEqual(capacity);
				previousFocus = result.focusDistance;
			}
		}
	});

	test("geometry stays separated and follows the intended accommodation direction", () => {
		const far = lensShape(0);
		let previousSpan = far.ringRadius - far.lensRadius;
		for (let value = 0; value <= 8; value += 0.05) {
			const shape = lensShape(value);
			const span = shape.ringRadius - shape.lensRadius;
			expect(span).toBeGreaterThan(0.3); // includes room for the ring tube
			expect(span).toBeLessThanOrEqual(previousSpan + 1e-12);
			expect(shape.thickness).toBeGreaterThanOrEqual(far.thickness);
			expect(shape.lensRadius).toBeLessThanOrEqual(far.lensRadius);
			expect(shape.lensRadius ** 2 * shape.thickness).toBeCloseTo(
				far.lensRadius ** 2 * far.thickness,
				10,
			);
			previousSpan = span;
		}
	});

	test("invalid and out-of-range inputs cannot generate invalid optics or geometry", () => {
		for (const input of [NaN, Infinity, -Infinity, -10, 0, 8, 100]) {
			expect(boundedAccommodation(input)).toBeGreaterThanOrEqual(0);
			expect(boundedAccommodation(input)).toBeLessThanOrEqual(8);
			for (const value of Object.values(lensShape(input))) {
				expect(Number.isFinite(value)).toBe(true);
			}
			for (const capacity of [NaN, Infinity, -10, 8, 100]) {
				for (const value of Object.values(reducedEye(input, capacity))) {
					expect(Number.isFinite(value)).toBe(true);
				}
			}
		}
	});
});
