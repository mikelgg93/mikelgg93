import "./lens.css";
import { useEffect, useId, useRef, useState } from "react";
import { RETINA_DISTANCE, reducedEye } from "./lensModel";

export default function LensFocus({
	lang = "en",
	showReserve = false,
}: {
	lang?: "en" | "es";
	showReserve?: boolean;
}) {
	const es = lang === "es";
	const [demand, setDemand] = useState(4);
	const [capacity, setCapacity] = useState(showReserve ? 2 : 8);
	const root = useRef<HTMLDivElement>(null);
	const titleId = useId();
	const descriptionId = useId();
	const model = reducedEye(demand, capacity);
	const lensX = 115;
	const retinaX = 320;
	const axisY = 130;
	const focusX =
		lensX + ((retinaX - lensX) * model.focusDistance) / RETINA_DISTANCE;
	const pixelsPerMetre = (retinaX - lensX) / RETINA_DISTANCE;
	const distance =
		demand === 0
			? es
				? "Infinito"
				: "Infinity"
			: `${(100 / demand).toFixed(demand > 4 ? 1 : 0)} cm`;

	useEffect(() => {
		const debug = root.current
			?.closest(".interactive-viewer")
			?.querySelector(".debug-output");
		if (debug)
			debug.textContent = JSON.stringify(
				{
					model:
						"Paraxial reduced eye; distances from equivalent principal plane",
					...reducedEye(demand, capacity),
					retinaDistance: RETINA_DISTANCE,
				},
				null,
				2,
			);
	}, [demand, capacity]);

	return (
		<div ref={root} className="lens-demo">
			<div className="lens-heading">
				<strong>
					{showReserve
						? es
							? "Cuando falta reserva"
							: "When reserve runs out"
						: es
							? "Mantener el foco"
							: "Keeping the focus"}
				</strong>
				<span className="lens-muted">
					{es ? "Modelo paraxial del ojo completo" : "Whole-eye paraxial model"}
				</span>
			</div>
			<div className="lens-stats" aria-live="polite">
				<div className="lens-stat">
					<span>{es ? "Demanda" : "Demand"}</span>
					<strong>{model.demand.toFixed(1)} D</strong>
				</div>
				<div className="lens-stat">
					<span>{es ? "Respuesta" : "Response"}</span>
					<strong>{model.response.toFixed(1)} D</strong>
				</div>
				<div className="lens-stat">
					<span>{es ? "Sin compensar" : "Unmet demand"}</span>
					<strong>{model.residual.toFixed(1)} D</strong>
				</div>
			</div>
			<svg
				className="lens-rays"
				viewBox="0 0 400 260"
				role="img"
				aria-labelledby={`${titleId} ${descriptionId}`}
			>
				<title id={titleId}>
					{es
						? "Diagrama de enfoque del ojo reducido"
						: "Reduced-eye focusing diagram"}
				</title>
				<desc id={descriptionId}>
					{es
						? `Demanda ${model.demand.toFixed(1)} dioptrías. Respuesta ${model.response.toFixed(1)}. ${model.residual > 0 ? "El foco queda detrás de la retina." : "El foco coincide con la retina."}`
						: `Demand ${model.demand.toFixed(1)} dioptres. Response ${model.response.toFixed(1)}. ${model.residual > 0 ? "Focus is behind the retina." : "Focus is on the retina."}`}
				</desc>
				<path d="M 12 130 H 386" stroke="#48605e" strokeDasharray="4 6" />
				<rect
					x={retinaX - 3}
					y="35"
					width="6"
					height="190"
					rx="3"
					fill="#db9380"
					opacity="0.65"
				/>
				<path
					d={`M ${lensX} 32 Q ${lensX - 17 - model.response * 1.8} 130 ${lensX} 228 Q ${lensX + 17 + model.response * 1.8} 130 ${lensX} 32`}
					fill="#79e2e01c"
					stroke="#79e2e0"
					strokeWidth="2"
				/>
				{[-75, -37.5, 0, 37.5, 75].map((height) => {
					const initialHeight =
						height * (1 - (model.demand * (lensX - 15)) / pixelsPerMetre);
					const endX = Math.max(retinaX + 25, focusX + 15);
					const endHeight = height * (1 - (endX - lensX) / (focusX - lensX));
					return (
						<path
							key={height}
							d={`M 15 ${axisY + initialHeight} L ${lensX} ${axisY + height} L ${endX} ${axisY + endHeight}`}
							fill="none"
							stroke={model.residual > 0 ? "#f5ca80" : "#8ee6d1"}
							strokeWidth="1.5"
							opacity={height === 0 ? 0.4 : 0.8}
						/>
					);
				})}
				<circle cx={focusX} cy={axisY} r="4" fill="#fff2c9" />
				<text x={lensX} y="22" fill="#b8dcd9" fontSize="16" textAnchor="middle">
					{es ? "Ojo equivalente" : "Equivalent eye"}
				</text>
				<text
					x={retinaX}
					y="22"
					fill="#edb4a5"
					fontSize="16"
					textAnchor="middle"
				>
					Retina
				</text>
				<text x="200" y="251" fill="#b8dcd9" fontSize="14" textAnchor="middle">
					{model.residual > 0
						? es
							? "Foco detrás de la retina"
							: "Focus behind the retina"
						: es
							? "Foco sobre la retina"
							: "Focus on the retina"}
				</text>
			</svg>
			<div className="lens-controls">
				<label>
					<span className="lens-value">
						<span>{es ? "Demanda de cerca" : "Near demand"}</span>
						<output>{distance}</output>
					</span>
					<input
						type="range"
						min="0"
						max="8"
						step="0.1"
						value={demand}
						onChange={(e) => setDemand(Number(e.target.value))}
					/>
				</label>
				<div className="lens-buttons">
					{[0, 2, 4].map((value) => (
						<button
							key={value}
							type="button"
							aria-pressed={demand === value}
							onClick={() => setDemand(value)}
						>
							{value === 0 ? (es ? "Lejos" : "Distance") : `${100 / value} cm`}
						</button>
					))}
				</div>
				{showReserve && (
					<label>
						<span className="lens-value">
							<span>
								{es ? "Acomodación disponible" : "Available accommodation"}
							</span>
							<output>{capacity.toFixed(1)} D</output>
						</span>
						<input
							type="range"
							min="0"
							max="8"
							step="0.1"
							value={capacity}
							onChange={(e) => setCapacity(Number(e.target.value))}
						/>
					</label>
				)}
				<p className="lens-note">
					{es
						? "Esquema óptico: el símbolo representa el ojo completo. No predice la agudeza visual ni muestra el trazado de rayos del cristalino 3D."
						: "Optical schematic: the symbol represents the whole eye. It does not predict visual acuity or trace rays through the 3D lens."}
				</p>
			</div>
		</div>
	);
}
