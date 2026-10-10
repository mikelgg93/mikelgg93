import "../lens/lens.css";
import "./models.css";
import { useMemo, useState } from "react";
import type { ParameterIndex } from "./populationModel";
import {
	COVARIANCE,
	MEAN,
	normalGenerator,
	PARAMETERS,
	statistics,
	UNITS,
} from "./populationModel";

export default function NormalVariation({
	lang = "en",
}: {
	lang?: "en" | "es";
}) {
	const es = lang === "es",
		[parameter, setParameter] = useState<ParameterIndex>(4),
		[spread, setSpread] = useState(1),
		[seed, setSeed] = useState(73);
	const normals = useMemo(() => {
		const normal = normalGenerator(seed);
		return Array.from({ length: 512 }, () => normal());
	}, [seed]);
	const mean = MEAN[parameter],
		referenceSD = Math.sqrt(COVARIANCE[parameter][parameter]),
		sd = referenceSD * spread;
	const values = normals.map((z) => mean + sd * z),
		stats = statistics(values);
	// Cover every draw, including tails. Keep a nonzero horizontal span at sigma=0.
	const half =
		referenceSD *
		Math.max(4, ...normals.map((z) => Math.abs(z) * spread * 1.02));
	const low = mean - half,
		width = (half * 2) / 32;
	const bins = Array<number>(32).fill(0);
	values.forEach((v) => {
		const bin = Math.min(31, Math.max(0, Math.floor((v - low) / width)));
		bins[bin] = (bins[bin] ?? 0) + 1;
	});
	const densityCount = (x: number) =>
		sd > 0
			? (Math.exp(-0.5 * ((x - mean) / sd) ** 2) /
					(sd * Math.sqrt(2 * Math.PI))) *
				values.length *
				width
			: 0;
	const maximum = Math.max(1, ...bins, densityCount(mean)) * 1.12;
	const x = (v: number) => 48 + ((v - low) / (2 * half)) * 552,
		y = (v: number) => 222 - (v / maximum) * 184;
	const curve = Array.from({ length: 161 }, (_, i) => {
		const v = low + (i / 160) * half * 2;
		return `${i ? "L" : "M"}${x(v)},${y(densityCount(v))}`;
	}).join(" ");
	return (
		<div className="lens-demo models-demo" data-demo="normal-variation">
			<div className="lens-heading">
				<strong>
					{es ? "Una variable, muchas muestras" : "One variable, many samples"}
				</strong>
				<span className="lens-muted">512 {es ? "muestras" : "draws"}</span>
			</div>
			<div className="lens-controls">
				<label>
					{es ? "Medida" : "Measurement"}
					<select
						value={parameter}
						onChange={(e) =>
							setParameter(Number(e.target.value) as ParameterIndex)
						}
					>
						{PARAMETERS.map((p, i) => (
							<option key={p} value={i}>
								{p === "K"
									? es
										? "K · potencia queratométrica"
										: "K · keratometric power"
									: p === "ACD"
										? es
											? "ACD · profundidad interna"
											: "ACD · internal depth"
										: p}{" "}
								({UNITS[i]})
							</option>
						))}
					</select>
				</label>
			</div>
			<svg
				className="models-plot"
				viewBox="0 0 640 280"
				role="img"
				aria-label={
					es
						? "Histograma de las muestras y curva normal esperada"
						: "Sample histogram and expected normal curve"
				}
			>
				<rect
					x={x(mean - sd)}
					y="24"
					width={x(mean + sd) - x(mean - sd)}
					height="198"
					fill="#e9ca79"
					opacity="0.08"
				/>
				{bins.map((count, i) => (
					<rect
						key={i}
						x={48 + (i * 552) / 32}
						y={y(count)}
						width={552 / 32 - 1}
						height={222 - y(count)}
						fill="#78c6c0"
						opacity="0.75"
					/>
				))}
				{sd > 0 && (
					<path d={curve} fill="none" stroke="#e9ca79" strokeWidth="2" />
				)}
				<path d="M48 28V222H600" fill="none" stroke="#809b98" />
				<text x="48" y="18">
					{es ? "Muestras por intervalo" : "Samples per bin"}
				</text>
				{[0, 1, 2, 3, 4].map((i) => (
					<text
						key={i}
						x={48 + i * 138}
						y="247"
						textAnchor={i === 0 ? "start" : i === 4 ? "end" : "middle"}
					>
						{(low + (i * half) / 2).toFixed(parameter === 1 ? 3 : 1)}
					</text>
				))}
				<text x="324" y="272" textAnchor="middle">
					{PARAMETERS[parameter]} ({UNITS[parameter]})
				</text>
			</svg>
			<div className="lens-controls">
				<label>
					<span className="lens-value">
						{es ? "Multiplicador de dispersión" : "Spread multiplier"}
						<output>{spread.toFixed(2)}×</output>
					</span>
					<input
						aria-label={
							es ? "Multiplicador de dispersión" : "Spread multiplier"
						}
						type="range"
						min="0"
						max="2"
						step="0.05"
						value={spread}
						onChange={(e) => setSpread(Number(e.target.value))}
					/>
				</label>
				<p className="models-equation">
					μ = {mean.toFixed(3)} · σ = {sd.toFixed(3)} {UNITS[parameter]}
				</p>
				<p className="lens-note">
					{es ? "Muestra obtenida" : "Actual sample"}: {es ? "media" : "mean"}{" "}
					{stats.mean.toFixed(3)}, SD {stats.sd.toFixed(3)}.{" "}
					{sd === 0
						? es
							? "Sin dispersión: todas las muestras coinciden; no hay densidad gaussiana continua."
							: "Zero spread: all samples coincide; there is no continuous Gaussian density."
						: es
							? "Oro: densidad normal × N × ancho del intervalo. Banda: μ ± σ. Se incluyen todas las colas."
							: "Gold: normal density × N × bin width. Band: μ ± σ. All tails are included."}
				</p>
				<div className="lens-buttons">
					<button type="button" onClick={() => setSeed((s) => (s + 1) >>> 0)}>
						{es ? "Nueva muestra" : "New draw"}
					</button>
				</div>
				<p className="lens-note">
					{es
						? "Solo 1× utiliza la dispersión de la tabla publicada. Los demás ajustes son experimentos; este histograma no aplica límites anatómicos."
						: "Only 1× uses the published table’s spread. Other settings are experiments; this histogram applies no anatomical bounds."}{" "}
					{es ? "Semilla" : "Seed"}: {seed}.
				</p>
			</div>
		</div>
	);
}
