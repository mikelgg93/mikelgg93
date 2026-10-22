import type { RefObject } from "react";
import { type RetinalFocusResult, rayHeight } from "./retinalFocus";

export function updateRetinalFocusInset(
	node: HTMLDivElement | null,
	model: RetinalFocusResult,
	pupil: number,
) {
	if (!node) return;
	const scale = Math.min(150, 100 / (Math.abs(model.errorMm) + 0.05));
	const xFocus = 200 - model.errorMm * scale;
	node.querySelector("[data-focus-dot]")?.setAttribute("cx", String(xFocus));
	const path = node.querySelector("[data-focus-rays]");
	path?.setAttribute(
		"d",
		[-1, 1]
			.map((sign) => {
				const height = (sign * pupil) / 2;
				const point = (x: number) =>
					`${x},${70 - rayHeight(height, model.retinalZ + (200 - x) / scale, model) * scale}`;
				return `M${point(20)} L${point(310)}`;
			})
			.join(" "),
	);
	const half = Math.abs(rayHeight(pupil / 2, model.retinalZ, model) * scale);
	const footprint = node.querySelector("[data-footprint]");
	footprint?.setAttribute("y1", String(70 - half));
	footprint?.setAttribute("y2", String(70 + half));
	const value = node.querySelector("[data-focus-error]");
	const text = `${model.errorMm >= 0 ? "+" : ""}${model.errorMm.toFixed(3)} mm · ${model.defocusD >= 0 ? "+" : ""}${model.defocusD.toFixed(2)} D`;
	if (value && value.textContent !== text) value.textContent = text;
}
export default function RetinalFocusInset({
	root,
	lang,
}: {
	root: RefObject<HTMLDivElement | null>;
	lang: "en" | "es";
}) {
	const es = lang === "es";
	return (
		<div ref={root} className="retina-focus-inset">
			<span>
				{es
					? "Enfoque ampliado · ejes a igual escala"
					: "Magnified focus · equal axis scales"}
			</span>
			<svg
				viewBox="0 0 330 125"
				role="img"
				aria-label={
					es
						? "Los rayos atraviesan el foco y alcanzan la referencia receptora"
						: "Rays pass through focus and reach the receiving reference"
				}
			>
				<path d="M200 20V105" stroke="#8cc4b5" strokeWidth="2" />
				<path data-focus-rays stroke="#e4bc79" strokeWidth="1.5" fill="none" />
				<line
					data-footprint
					x1="200"
					x2="200"
					stroke="#f5dbb0"
					strokeWidth="4"
				/>
				<circle data-focus-dot cx="200" cy="70" r="3" fill="#e4bc79" />
				<text x="200" y="14" fill="#8cc4b5" fontSize="11" textAnchor="middle">
					{es ? "Referencia receptora" : "Receiving reference"}
				</text>
				<text x="15" y="120" fill="currentColor" fontSize="11">
					{es
						? "Punto: foco · segmento: huella retiniana"
						: "Dot: focus · segment: retinal footprint"}
				</text>
			</svg>
			<span data-focus-error aria-live="off" />
			<p>
				{es
					? "Desplazamiento positivo: foco anterior a la referencia. Plano receptor ilustrativo a 0,05 mm delante del límite del EPR."
					: "Positive displacement: focus anterior to the reference. Illustrative receiving plane 0.05 mm anterior to the RPE boundary."}
			</p>
		</div>
	);
}
