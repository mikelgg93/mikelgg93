import { writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import {
	atchison,
	NAVARRO,
	TEACHING,
} from "../src/components/eye/models/eyeModels";
import {
	type Patch,
	patchPoint,
} from "../src/components/eye/models/modelGeometry";
import { generatePopulation } from "../src/components/eye/models/populationModel";

// Original vector illustration generated from the same prescriptions as the demos.
const models = [TEACHING, NAVARRO, atchison(-6)];
const parts: string[] = [];
for (const [i, eye] of models.entries()) {
	const offset = 95 + i * 305;
	for (const patch of [
		"frontCornea",
		"backCornea",
		"frontLens",
		"backLens",
		"retina",
	] as Patch[]) {
		const aperture =
			patch === "retina" ? 9 : patch.includes("Cornea") ? 5 : 4.2;
		const path = Array.from({ length: 101 }, (_, j) => {
			const r = -aperture + (j / 100) * aperture * 2;
			const p = patchPoint(eye, patch, Math.abs(r), r < 0 ? Math.PI : 0);
			return `${j ? "L" : "M"}${offset - p[2] * 8},${225 + p[0] * 8}`;
		}).join(" ");
		const colour =
			patch === "retina"
				? "#d18d6b"
				: patch.includes("Cornea")
					? "#73c4dc"
					: "#e9ca79";
		parts.push(
			`<path d="${path}" stroke="${colour}" stroke-width="3" fill="none"/>`,
		);
	}
}
const samples = generatePopulation(2026, true, 90).samples;
for (const [k, , acd, lt] of samples) {
	parts.push(
		`<circle cx="${250 + (acd! - 1.5) * 190}" cy="${520 - (lt! - 2.5) * 48}" r="${2.5 + (k! - 35) / 12}" fill="#78c6c0" opacity=".45"/>`,
	);
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#071e1e"/><path d="M64 225H1125M160 548H1025" stroke="#46635e" stroke-dasharray="4 8"/><text x="64" y="78" fill="#e9e9dc" font-family="serif" font-size="37" font-style="italic">One eye is not a population</text><text x="66" y="112" fill="#8da9a2" font-family="sans-serif" font-size="15" letter-spacing="4">WEBGL EYE · V</text>${parts.join("")}<text x="1025" y="578" text-anchor="end" fill="#8da9a2" font-family="sans-serif" font-size="15">GEOMETRY → PRESCRIPTIONS → DISTRIBUTIONS</text></svg>`;
writeFileSync("public/images/blog/eye-models-banner.svg", svg);
writeFileSync(
	"public/images/blog/eye-models-banner.png",
	new Resvg(svg).render().asPng(),
);
