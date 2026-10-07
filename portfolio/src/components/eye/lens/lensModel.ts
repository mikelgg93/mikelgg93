// All dimensions here are illustrative model parameters, not fitted biometry.
export const MAX_ACCOMMODATION = 8;
export const DISTANCE_POWER = 60; // D, equivalent power of the whole reduced eye
export const IMAGE_INDEX = 4 / 3; // conventional reduced-eye approximation
export const RETINA_DISTANCE = IMAGE_INDEX / DISTANCE_POWER; // m from principal plane

export function boundedAccommodation(value: number): number {
	return Number.isFinite(value)
		? Math.min(MAX_ACCOMMODATION, Math.max(0, value))
		: 0;
}

export function lensShape(accommodation: number) {
	const fraction = boundedAccommodation(accommodation) / MAX_ACCOMMODATION;
	const thickness = 3.6 + 0.6 * fraction;
	return {
		// A smaller ciliary ring reduces the representative zonular span.
		ringRadius: 6 - 0.5 * fraction,
		// Preserve the volume of this ellipsoidal model while it rounds up.
		lensRadius: 4.6 * Math.sqrt(3.6 / thickness),
		thickness,
		fraction,
	};
}

export function reducedEye(demand: number, capacity = MAX_ACCOMMODATION) {
	const safeDemand = boundedAccommodation(demand);
	const response = Math.min(safeDemand, boundedAccommodation(capacity));
	// L' = L + F; object vergence in air is -demand. These are whole-eye
	// equivalent powers, not a sum of isolated corneal and crystalline powers.
	const power = DISTANCE_POWER + response;
	const imageVergence = power - safeDemand;
	return {
		demand: safeDemand,
		response,
		power,
		residual: safeDemand - response,
		focusDistance: IMAGE_INDEX / imageVergence,
	};
}
