import ParameterControl, { useInitialParameters } from "../ParameterControl";
import { parameterContext } from "../parameterContext";
import "../lens/lens.css";
import "./retina.css";
import { useMemo, useState } from "react";
import { useViewerDebug } from "../useViewerDebug";
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
	const atBoundary = frequency === model.nyquist;
	const root = useViewerDebug({
		model: "Uniform 1D point sampling; frequencies in cycles/panel",
		frequency: model.f,
		count: model.n,
		phaseRadians: shift ? Math.PI / 2 : 0,
		nyquist: model.nyquist,
		foldedFrequency: model.alias,
		samples: model.samples,
	});
	const defaults = useInitialParameters(
		{ frequency, count, shift },
		(initial) => {
			setFrequency(initial.frequency);
			setCount(initial.count);
			setShift(initial.shift);
		},
		root,
	);
	return (
		<div ref={root} className="lens-demo retina-demo">
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
					{atBoundary
						? es
							? "En el límite: mismas muestras"
							: "At the boundary: same samples"
						: aliases
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
				<ParameterControl
					hideReset
					value={frequency}
					initial={defaults.frequency}
					onReset={setFrequency}
					label="stripe frequency"
					lang={lang}
					context={parameterContext.sampling}
				>
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
				</ParameterControl>
				<ParameterControl
					hideReset
					value={count}
					initial={defaults.count}
					onReset={setCount}
					label="sample count"
					lang={lang}
				>
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
				</ParameterControl>
				<div className="lens-buttons">
					<ParameterControl
						hideReset
						value={shift}
						initial={defaults.shift}
						onReset={setShift}
						label="stripe phase"
						lang={lang}
					>
						<button
							type="button"
							aria-pressed={shift}
							onClick={() => setShift(!shift)}
						>
							{es ? "Desplazar ¼ de ciclo" : "Shift ¼ cycle"}
						</button>
					</ParameterControl>
				</div>
				<p className="lens-note">
					{atBoundary
						? es
							? "En el límite, la fase puede hacer desaparecer las franjas de las muestras."
							: "At the boundary, phase can hide the stripes in the samples."
						: aliases
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
