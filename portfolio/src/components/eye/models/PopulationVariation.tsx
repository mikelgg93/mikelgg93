import "../lens/lens.css";
import "./models.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dimensions } from "./ModelComparison";
import ModelScene from "./ModelScene";
import {
	COVARIANCE,
	covarianceFor,
	GUARDS,
	generatePopulation,
	MEAN,
	PARAMETERS,
	populationEye,
	SOURCE,
	sampleCorrelation,
	UNITS,
} from "./populationModel";

export default function PopulationVariation({
	lang = "en",
}: {
	lang?: "en" | "es";
}) {
	const es = lang === "es",
		[correlated, setCorrelated] = useState(true),
		[seed, setSeed] = useState(2026),
		[selected, setSelected] = useState(0),
		[pair, setPair] = useState(0);
	const result = useMemo(
		() => generatePopulation(seed, correlated),
		[seed, correlated],
	);
	const eye = useMemo(
		() => populationEye(result.samples[selected]!),
		[result, selected],
	);
	const downloads = useRef(new Map<string, ReturnType<typeof setTimeout>>());
	useEffect(
		() => () => {
			for (const [url, timer] of downloads.current) {
				clearTimeout(timer);
				URL.revokeObjectURL(url);
			}
			downloads.current.clear();
		},
		[],
	);
	const [a, b] = pair === 0 ? ([2, 3] as const) : ([4, 0] as const);
	const x = (v: number) =>
		58 + ((v - GUARDS[a][0]) / (GUARDS[a][1] - GUARDS[a][0])) * 530;
	const y = (v: number) =>
		252 - ((v - GUARDS[b][0]) / (GUARDS[b][1] - GUARDS[b][0])) * 218;
	const targetR = correlated
		? COVARIANCE[a][b] / Math.sqrt(COVARIANCE[a][a] * COVARIANCE[b][b])
		: 0;
	function download() {
		const documentData = {
			format: "webgl-eye-population-v1",
			seed,
			generator: "Mulberry32 + Box-Muller",
			mode: correlated ? "published-covariance" : "independent",
			source: SOURCE,
			sourceTables: "A1/A2 right-eye five-variable marginal",
			parameters: PARAMETERS,
			units: UNITS,
			mean: MEAN,
			covariance: covarianceFor(correlated),
			drawingGuards: GUARDS,
			minimumVitreousSpanMm: 10,
			attempted: result.attempted,
			rejected: result.rejected,
			samples: result.samples,
			scope:
				"Teaching subset; no age conditioning or optical/refraction validation. Remaining surface shapes are fixed. Rejection changes the distribution. Axial endpoints are not histologically harmonised.",
		};
		const url = URL.createObjectURL(
			new Blob([JSON.stringify(documentData, null, 2)], {
				type: "application/json",
			}),
		);
		const link = document.createElement("a");
		link.href = url;
		link.download = `eye-population-${seed}-${correlated ? "correlated" : "independent"}.json`;
		document.body.appendChild(link);
		link.click();
		link.remove();
		downloads.current.set(
			url,
			setTimeout(() => {
				URL.revokeObjectURL(url);
				downloads.current.delete(url);
			}, 1000),
		);
	}
	return (
		<div className="lens-demo models-demo" data-demo="population-variation">
			<div className="lens-heading">
				<strong>
					{es
						? "De una nube de puntos a un ojo"
						: "From a point cloud to an eye"}
				</strong>
				<span className="lens-muted">
					256 {es ? "ojos sintéticos" : "synthetic eyes"}
				</span>
			</div>
			<div className="lens-controls">
				<div className="lens-buttons">
					<button
						type="button"
						aria-pressed={!correlated}
						onClick={() => setCorrelated(false)}
					>
						{es ? "Independientes" : "Independent"}
					</button>
					<button
						type="button"
						aria-pressed={correlated}
						onClick={() => setCorrelated(true)}
					>
						{es ? "Covarianza publicada" : "Published covariance"}
					</button>
				</div>
				<label>
					{es ? "Comparar medidas" : "Compare measurements"}
					<select
						value={pair}
						onChange={(e) => setPair(Number(e.target.value))}
					>
						<option value="0">
							{es ? "ACD interna × LT" : "Internal ACD × LT"}
						</option>
						<option value="1">
							{es ? "AL × K queratométrica" : "AL × keratometric K"}
						</option>
					</select>
				</label>
			</div>
			<svg
				className="models-plot"
				viewBox="0 0 640 324"
				role="img"
				aria-label={
					es
						? "Dispersión de medidas sintéticas; el punto dorado corresponde al ojo seleccionado"
						: "Synthetic measurements; the gold point is the selected eye"
				}
			>
				{[0, 1, 2, 3, 4].map((i) => (
					<g key={i}>
						<path
							d={`M58 ${34 + (i * 218) / 4}H588`}
							stroke="#45625e"
							opacity="0.5"
						/>
						<text x="48" y={39 + (i * 218) / 4} textAnchor="end">
							{(GUARDS[b][1] - (i / 4) * (GUARDS[b][1] - GUARDS[b][0])).toFixed(
								1,
							)}
						</text>
						<text x={58 + (i * 530) / 4} y="275" textAnchor="middle">
							{(GUARDS[a][0] + (i / 4) * (GUARDS[a][1] - GUARDS[a][0])).toFixed(
								1,
							)}
						</text>
					</g>
				))}
				{result.samples.map((v, i) => (
					<circle
						key={i}
						cx={x(v[a])}
						cy={y(v[b])}
						r="3"
						fill="#78c6c0"
						opacity="0.65"
					/>
				))}
				<circle
					cx={x(result.samples[selected]![a])}
					cy={y(result.samples[selected]![b])}
					r="6"
					fill="#e9ca79"
					stroke="#fff4d2"
					strokeWidth="2"
				/>
				<text x="58" y="20">
					{PARAMETERS[b]} ({UNITS[b]})
				</text>
				<text x="323" y="305" textAnchor="middle">
					{PARAMETERS[a]} ({UNITS[a]})
				</text>
			</svg>
			<div className="lens-controls">
				<p className="models-equation">
					{es ? "Correlación objetivo" : "Target correlation"}:{" "}
					{targetR.toFixed(2)} · {es ? "muestra aceptada" : "accepted sample"}:{" "}
					{sampleCorrelation(result.samples, a, b)?.toFixed(2) ?? "—"}
				</p>
				<label>
					<span className="lens-value">
						{es ? "Inspeccionar ojo" : "Inspect eye"}
						<output>
							{selected + 1} / {result.samples.length}
						</output>
					</span>
					<input
						aria-label={es ? "Inspeccionar ojo" : "Inspect eye"}
						type="range"
						min="0"
						max={result.samples.length - 1}
						step="1"
						value={selected}
						onChange={(e) => setSelected(Number(e.target.value))}
					/>
				</label>
			</div>
			<ModelScene eye={eye} lang={lang} />
			<Dimensions eye={eye} lang={lang} />
			<div className="lens-controls">
				<p className="models-equation">
					K = {result.samples[selected]![0].toFixed(2)} D → R ={" "}
					{(337.5 / result.samples[selected]![0]).toFixed(2)} mm
				</p>
				<div className="lens-buttons">
					<button type="button" onClick={() => setSeed((s) => (s + 1) >>> 0)}>
						{es ? "Nueva población" : "New population"}
					</button>
					<button type="button" onClick={download}>
						{es ? "Descargar JSON" : "Download JSON"}
					</button>
				</div>
				<p className="lens-note" aria-live="polite">
					{es ? "Semilla" : "Seed"}: {seed} · {result.rejected} /{" "}
					{result.attempted}{" "}
					{es
						? "candidatos descartados por los límites de dibujo."
						: "candidates rejected by drawing guards."}
				</p>
				<p className="lens-note">
					{es
						? "* AL coloca aquí la superficie posterior del dibujo; el tramo vítreo se obtiene por diferencia. Solo varían estas cinco medidas. Q, la córnea posterior y las formas del cristalino y retina se mantienen fijas. No se calculan refracción ni calidad de imagen."
						: "* AL positions the drawing’s posterior surface; the vitreous span is the remainder. Only these five measurements vary. Q, posterior cornea, and lens/retinal shapes stay fixed. Refraction and image quality are not calculated."}
				</p>
			</div>
		</div>
	);
}
