// A repeating teaching sequence, not measured accommodation dynamics.
export function focusDemand(seconds: number) {
	const t = ((seconds % 14) + 14) % 14;
	const smooth = (x: number) => x * x * (3 - 2 * x);
	if (t < 2) return 0;
	if (t < 6) return 6 * smooth((t - 2) / 4);
	if (t < 8) return 6;
	if (t < 12) return 6 * (1 - smooth((t - 8) / 4));
	return 0;
}

export function nearPupil(accommodation: number) {
	// Constant-light illustrative near miosis; not a universal D-to-mm law.
	return 5.8 - 2.4 * Math.min(1, Math.max(0, accommodation / 6));
}
