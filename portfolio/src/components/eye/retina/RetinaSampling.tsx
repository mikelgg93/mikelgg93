import "../lens/lens.css";
import "./retina.css";
import { useMemo, useState } from "react";
import { samplingModel } from "./retinaModel";

const grey = (value: number) =>
	`rgb(${Math.round(value * 255)} ${Math.round(value * 255)} ${Math.round(value * 255)})`;
export default function RetinaSampling({
	lang = "en",
}: {
	lang?: "en" | "es";
}) {
	const es = lang === "es",
		[frequency, setFrequency] = useState(4),
		[count, setCount] = useState(16),
		[shift, setShift] = useState(false);
	const model = useMemo(
		() => samplingModel(frequency, count, shift ? Math.PI / 2 : 0),
		[frequency, count, shift],
	);
	const strips = (fn: (x: number) => number, y: number) =>
		Array.from({ length: 320 }, (_, i) => (
			<rect
				key={i}
				x={20 + i * 1.75}
				y={y}
				width="1.8"
				height="55"
				fill={grey(fn((i + 0.5) / 320))}
			/>
		));
	const aliases = frequency > model.nyquist;
	return (
		<div className="lens-demo retina-demo">
			<div className="lens-heading">
				<strong>
					{es ? "Una imagen, muestras finitas" : "One image, finite samples"}
				</strong>
				<span className="lens-muted">
					{es ? "Experimento uniforme en 1D" : "Uniform 1D experiment"}
				</span>
			</div>
			<svg
				className="retina-figure"
				viewBox="0 0 600 300"
				role="img"
				aria-label={
					es
						? "Franjas sinusoidales, muestras puntuales y otro patrón que produce las mismas muestras"
						: "Sinusoidal stripes, point samples, and another pattern producing the same samples"
				}
			>
				<text x="20" y="30" fill="#dce9e7" fontSize="26">
					{es ? "Patrón de entrada" : "Input pattern"}
				</text>
				{strips(model.signal, 43)}
				<text x="20" y="136" fill="#dce9e7" fontSize="26">
					{es ? "Muestras puntuales" : "Point samples"}
				</text>
				{model.samples.map((s, i) => (
					<circle
						key={i}
						cx={20 + 560 * s.x}
						cy="160"
						r={Math.min(10, 200 / count)}
						fill={grey(s.value)}
						stroke="#e5b773"
						strokeWidth="1.5"
					/>
				))}
				<text x="20" y="214" fill="#dce9e7" fontSize="26">
					{aliases
						? es
							? "Patrón de baja frecuencia compatible"
							: "Matching low-frequency pattern"
						: es
							? "Misma frecuencia, mismas muestras"
							: "Same frequency, same samples"}
				</text>
				{strips(model.alternative, 230)}
			</svg>
			<div className="retina-readouts">
				<span>
					{es ? "Límite de Nyquist" : "Nyquist boundary"}: {model.nyquist}{" "}
					{es ? "ciclos/panel" : "cycles/panel"}
				</span>
				<span>
					{es ? "Frecuencia plegada" : "Folded frequency"}:{" "}
					{Math.abs(model.alias).toFixed(1)}
				</span>
			</div>
			<div className="lens-controls">
				<label>
					<span className="lens-value">
						{es
							? "Franjas (ciclos en el panel)"
							: "Stripes (cycles across panel)"}
						<output>{frequency.toFixed(1)}</output>
					</span>
					<input
						aria-label={es ? "Frecuencia de las franjas" : "Stripe frequency"}
						type="range"
						min="1"
						max="24"
						step="0.5"
						value={frequency}
						onChange={(e) => setFrequency(Number(e.target.value))}
					/>
				</label>
				<label>
					<span className="lens-value">
						{es ? "Número de muestras" : "Number of samples"}
						<output>{count}</output>
					</span>
					<input
						aria-label={es ? "Número de muestras" : "Number of samples"}
						type="range"
						min="8"
						max="32"
						step="8"
						value={count}
						onChange={(e) => setCount(Number(e.target.value))}
					/>
				</label>
				<div className="lens-buttons">
					<button
						type="button"
						aria-pressed={shift}
						onClick={() => setShift(!shift)}
					>
						{es ? "Desplazar ¼ de ciclo" : "Shift ¼ cycle"}
					</button>
				</div>
				<p className="lens-note">
					{aliases
						? es
							? "Por encima del límite, un patrón más grueso coincide con las mismas muestras."
							: "Above the boundary, a coarser pattern matches the same samples."
						: es
							? "Aumenta la frecuencia por encima del límite. En el propio límite, la fase también importa."
							: "Raise the frequency above the boundary. At the boundary itself, phase also matters."}{" "}
					{es
						? "No es una predicción de agudeza visual ni una simulación de lo que ves."
						: "This is not an acuity prediction or a simulation of what you see."}
				</p>
			</div>
		</div>
	);
}
