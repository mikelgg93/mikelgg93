import "../lens/lens.css";
import "./retina.css";
import { useMemo, useState } from "react";
import { useInitialParameters } from "../ParameterControl";
import { useViewerDebug } from "../useViewerDebug";
import { fieldResponse, type LightPattern } from "./receptiveField";

export default function RetinaReceptiveField({
	lang = "en",
}: {
	lang?: "en" | "es";
}) {
	const es = lang === "es";
	const [pattern, setPattern] = useState<LightPattern>("spot");
	const [position, setPosition] = useState(0);
	const response = useMemo(
		() => fieldResponse(pattern, position),
		[pattern, position],
	);
	const root = useViewerDebug({
		model:
			"Balanced spatial centre-surround filter; no firing-rate or temporal model",
		pattern,
		...response,
	});
	useInitialParameters(
		{ pattern, position },
		(initial) => {
			setPattern(initial.pattern);
			setPosition(initial.position);
		},
		root,
	);
	return (
		<div ref={root} className="lens-demo retina-demo">
			<div className="lens-heading">
				<strong>
					{es ? "La misma luz, dos vías" : "The same light, two pathways"}
				</strong>
				<span className="lens-muted">
					{es ? "Filtro espacial ilustrativo" : "Illustrative spatial filter"}
				</span>
			</div>
			<div className="retina-field-panels">
				<svg
					className="retina-figure"
					viewBox="-2 -2 4 4"
					role="img"
					aria-label={
						es
							? "Luz respecto al centro y la periferia del campo receptivo"
							: "Light relative to the receptive-field centre and surround"
					}
				>
					<rect
						x="-2"
						y="-2"
						width="4"
						height="4"
						fill={pattern === "uniform" ? "#dce9e7" : "#697a75"}
					/>
					{pattern === "annulus" ? (
						<circle
							cx={response.x}
							cy="0"
							r="0.85"
							stroke="#dce9e7"
							strokeWidth="0.6"
							fill="none"
						/>
					) : (
						pattern !== "uniform" && (
							<circle
								cx={response.x}
								cy="0"
								r="0.28"
								fill={pattern === "dark" ? "#142a25" : "#dce9e7"}
							/>
						)
					)}
					<circle
						r="0.3"
						fill="none"
						stroke="#e5b773"
						strokeWidth="0.025"
						strokeDasharray="0.06 0.05"
					/>
					<circle
						r="1.2"
						fill="none"
						stroke="#173c3a"
						strokeWidth="0.025"
						strokeDasharray="0.06 0.05"
					/>
					<path
						d="M-0.07 0H0.07M0 -0.07V0.07"
						stroke="#173c3a"
						strokeWidth="0.02"
					/>
				</svg>
				<div className="retina-field-output">
					<p>
						{es
							? "Cambio de señal respecto al fondo"
							: "Change in drive relative to background"}
					</p>
					<svg
						viewBox="0 0 420 150"
						role="img"
						aria-label={
							es
								? `ON: ${response.on.toFixed(2)}; OFF: ${response.off.toFixed(2)}. Unidades relativas.`
								: `ON: ${response.on.toFixed(2)}; OFF: ${response.off.toFixed(2)}. Relative units.`
						}
					>
						<path
							d="M240 15V120M80 120H400"
							stroke="currentColor"
							opacity="0.4"
						/>
						{(
							[
								["ON", response.on],
								["OFF", response.off],
							] as const
						).map(([label, value], i) => (
							<g key={label}>
								<text x="10" y={46 + i * 48} fill="currentColor" fontSize="18">
									{label}
								</text>
								<rect
									x={240 + Math.min(0, value) * 150}
									y={28 + i * 48}
									width={Math.abs(value) * 150}
									height="24"
									fill={value >= 0 ? "#c28a35" : "#937bb5"}
								/>
								<text
									x="390"
									y={46 + i * 48}
									textAnchor="end"
									fill="currentColor"
									fontSize="15"
								>
									{value.toFixed(2)}
								</text>
							</g>
						))}
						<text x="80" y="145" fill="currentColor" fontSize="15">
							−
						</text>
						<text
							x="240"
							y="145"
							textAnchor="middle"
							fill="currentColor"
							fontSize="15"
						>
							0
						</text>
						<text
							x="400"
							y="145"
							textAnchor="end"
							fill="currentColor"
							fontSize="15"
						>
							+
						</text>
					</svg>
					<p>
						{es
							? "Negativo significa menos señal, no una frecuencia de disparo negativa."
							: "Negative means less drive, not a negative firing rate."}
					</p>
				</div>
			</div>
			<div className="lens-controls">
				<label>
					{es ? "Luz" : "Light"}
					<select
						value={pattern}
						onChange={(e) => setPattern(e.target.value as LightPattern)}
					>
						<option value="spot">{es ? "Punto claro" : "Bright spot"}</option>
						<option value="dark">{es ? "Punto oscuro" : "Dark spot"}</option>
						<option value="annulus">
							{es ? "Anillo claro" : "Bright annulus"}
						</option>
						<option value="uniform">
							{es ? "Luz uniforme" : "Uniform light"}
						</option>
					</select>
				</label>
				<label>
					<span className="lens-value">
						{es ? "Posición horizontal" : "Horizontal position"}
						<output>{position.toFixed(2)}</output>
					</span>
					<input
						type="range"
						min="-1.5"
						max="1.5"
						step="0.05"
						value={position}
						disabled={pattern === "uniform"}
						onChange={(e) => setPosition(Number(e.target.value))}
					/>
				</label>
				<p className="lens-note">
					{es
						? "El contorno dorado orienta el centro. Las sensibilidades son graduales, no dos zonas de borde definido. Compara el punto central, el anillo y la luz uniforme con la posición en cero."
						: "The gold outline locates the centre. Sensitivity changes gradually, rather than at two sharp boundaries. Compare the central spot, annulus and uniform light with position at zero."}
				</p>
			</div>
		</div>
	);
}
