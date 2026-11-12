// Balanced difference of two normalised Gaussians: a spatial teaching filter.
// Coordinates, widths and gain are illustrative; outputs are signed drive, not spikes.
export type LightPattern = "spot" | "dark" | "annulus" | "uniform";
const cells: { x: number; y: number; centre: number; surround: number }[] = [];
let centreTotal = 0;
let surroundTotal = 0;
for (let iy = 0; iy < 81; iy++) {
	for (let ix = 0; ix < 81; ix++) {
		const x = (ix - 40) * 0.05;
		const y = (iy - 40) * 0.05;
		const r2 = x * x + y * y;
		const centre = Math.exp(-r2 / (2 * 0.22 ** 2));
		const surround = Math.exp(-r2 / (2 * 0.7 ** 2));
		cells.push({ x, y, centre, surround });
		centreTotal += centre;
		surroundTotal += surround;
	}
}
export function fieldResponse(pattern: LightPattern, position: number) {
	const x = Number.isFinite(position)
		? Math.max(-1.5, Math.min(1.5, position))
		: 0;
	let centre = 0;
	let surround = 0;
	for (const cell of cells) {
		const r = Math.hypot(cell.x - x, cell.y);
		const contrast =
			pattern === "uniform"
				? 1
				: pattern === "annulus"
					? Number(r >= 0.55 - 1e-12 && r <= 1.15 + 1e-12)
					: r <= 0.28 + 1e-12
						? pattern === "dark"
							? -1
							: 1
						: 0;
		centre += contrast * cell.centre;
		surround += contrast * cell.surround;
	}
	centre /= centreTotal;
	surround /= surroundTotal;
	const difference = centre - surround;
	const on = Math.abs(difference) < 1e-12 ? 0 : difference;
	return { x, centre, surround, on, off: -on };
}
