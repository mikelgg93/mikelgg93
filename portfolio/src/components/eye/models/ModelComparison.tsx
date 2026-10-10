import "../lens/lens.css";
import "./models.css";
import { useMemo, useState } from "react";
import {
	atchison,
	type EyePrescription,
	NAVARRO,
	TEACHING,
	vitreousDepth,
} from "./eyeModels";
import ModelScene from "./ModelScene";

export function Dimensions({
	eye,
	lang = "en",
}: {
	eye: EyePrescription;
	lang?: "en" | "es";
}) {
	const es = lang === "es";
	return (
		<div className="models-dimensions">
			{[
				["CCT", eye.cct],
				[es ? "ACD interna" : "Internal ACD", eye.acd],
				["LT", eye.lt],
				[es ? "Tramo vítreo*" : "Vitreous span*", vitreousDepth(eye)],
				[es ? "Extremo axial*" : "Axial endpoint*", eye.axial],
			].map(([label, value]) => (
				<div key={label}>
					<span>{label}</span>
					<strong>
						{Number(value).toFixed(2)} <small>mm</small>
					</strong>
				</div>
			))}
		</div>
	);
}
export default function ModelComparison({
	lang = "en",
}: {
	lang?: "en" | "es";
}) {
	const es = lang === "es",
		[model, setModel] = useState("teaching"),
		[sr, setSR] = useState(0);
	const eye = useMemo(
		() =>
			model === "teaching"
				? TEACHING
				: model === "navarro"
					? NAVARRO
					: atchison(sr),
		[model, sr],
	);
	return (
		<div className="lens-demo models-demo" data-demo="model-comparison">
			<div className="lens-heading">
				<strong>
					{es ? "Tres modelos, una escala" : "Three models, one scale"}
				</strong>
				<span className="lens-muted">
					{es ? "Comparación geométrica" : "Geometry comparison"}
				</span>
			</div>
			<div className="lens-controls">
				<div className="lens-buttons">
					{[
						["teaching", es ? "Nuestro modelo" : "Our assembly"],
						["navarro", "Navarro · 1999"],
						["atchison", "Atchison · 2006"],
					].map(([id, label]) => (
						<button
							type="button"
							key={id}
							aria-pressed={model === id}
							onClick={() => setModel(id!)}
						>
							{label}
						</button>
					))}
				</div>
				{model === "atchison" && (
					<label>
						<span className="lens-value">
							{es
								? "Refracción del modelo (SR)"
								: "Model spectacle refraction (SR)"}
							<output>{sr.toFixed(1)} D</output>
						</span>
						<input
							aria-label={
								es ? "Refracción del modelo" : "Model spectacle refraction"
							}
							type="range"
							min="-10"
							max="0"
							step="0.25"
							value={sr}
							onChange={(e) => setSR(Number(e.target.value))}
						/>
					</label>
				)}
			</div>
			<ModelScene eye={eye} lang={lang} />
			<Dimensions eye={eye} lang={lang} />
			<div className="lens-controls">
				<p className="lens-note">
					{model === "teaching"
						? es
							? "* Hasta la referencia del EPR de la Parte IV. Se muestra esa envolvente; se omiten el espesor neural y la fóvea."
							: "* To Part IV’s RPE proxy. Its envelope is shown; neural thickness and the fovea are omitted."
						: es
							? "* Hasta la superficie imagen prescrita. No identifica por sí sola una capa histológica."
							: "* To the prescribed image surface. This does not by itself identify a histological layer."}
				</p>
				<p className="lens-note">
					{es
						? "Ventanas de dibujo comunes: córnea Ø10 mm, cristalino Ø8,4 mm, polo posterior Ø18 mm. Son parches abiertos, no tejidos completos. Los materiales no calculan la óptica ni el GRIN."
						: "Common drawing windows: cornea Ø10 mm, lens Ø8.4 mm, posterior pole Ø18 mm. These are open surface patches, not complete tissues. Materials do not calculate optics or GRIN."}
				</p>
			</div>
		</div>
	);
}
