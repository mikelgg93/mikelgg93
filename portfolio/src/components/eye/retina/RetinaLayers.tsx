import "../lens/lens.css";
import "./retina.css";
import { useState } from "react";
import { layerBounds, retinalLayers } from "./retinaModel";

export default function RetinaLayers({ lang = "en" }: { lang?: "en" | "es" }) {
	const es = lang === "es",
		[pit, setPit] = useState(false),
		[separate, setSeparate] = useState(false);
	const xs = Array.from({ length: 121 }, (_, i) => -1 + i / 60);
	const bandPath = (index: number) =>
		xs
			.map(
				(x, i) =>
					`${i ? "L" : "M"}${80 + (x + 1) * 220},${layerBounds(x, pit, separate)[index]!.top + 40}`,
			)
			.join(" ") +
		" " +
		[...xs]
			.reverse()
			.map(
				(x) =>
					`L${80 + (x + 1) * 220},${layerBounds(x, pit, separate)[index]!.bottom + 40}`,
			)
			.join(" ") +
		" Z";
	return (
		<div className="lens-demo retina-demo">
			<div className="lens-heading">
				<strong>
					{es ? "Una sección, varias tareas" : "One section, several jobs"}
				</strong>
				<span className="lens-muted">
					{es
						? "Bandas agrupadas · sin escala"
						: "Grouped bands · not to scale"}
				</span>
			</div>
			<svg
				className="retina-figure"
				viewBox="0 0 600 400"
				role="img"
				aria-label={
					es
						? "Sección retiniana con luz hacia los fotorreceptores y señal hacia las células ganglionares"
						: "Retinal section: light towards photoreceptors, signals towards ganglion cells"
				}
			>
				<text x="300" y="30" textAnchor="middle" fill="#dce9e7" fontSize="26">
					{es ? "Vítreo / lado de la luz" : "Vitreous / light side"}
				</text>
				{retinalLayers.map((layer, i) => (
					<path
						key={layer.en}
						d={bandPath(i)}
						fill={layer.color}
						stroke="#061e20"
						strokeWidth="1"
					/>
				))}
				<path
					d="M40 80V320m-9-13 9 13 9-13"
					fill="none"
					stroke="#f1d99f"
					strokeWidth="3"
				/>
				<path
					d="M560 300V100m-9 13 9-13 9 13"
					fill="none"
					stroke="#88cbbf"
					strokeWidth="3"
				/>
				<text x="300" y="382" textAnchor="middle" fill="#dce9e7" fontSize="26">
					{es ? "Hacia la coroides" : "Towards the choroid"}
				</text>
			</svg>
			<p className="retina-reading">
				{es
					? "↓ Luz entrante · ↑ Dirección general de la señal hacia las células ganglionares"
					: "↓ Incoming light · ↑ Overall signal direction towards ganglion cells"}
			</p>
			<ol className="retina-bands">
				{retinalLayers.map((layer, i) => (
					<li key={layer.en}>
						<span className="retina-dot" style={{ background: layer.color }} />
						{i + 1}. {es ? layer.es : layer.en}
					</li>
				))}
			</ol>
			<div className="lens-controls">
				<div className="lens-buttons">
					<button type="button" aria-pressed={pit} onClick={() => setPit(!pit)}>
						{es ? "Mostrar fóvea" : "Show fovea"}
					</button>
					<button
						type="button"
						aria-pressed={separate}
						onClick={() => setSeparate(!separate)}
					>
						{es ? "Separar bandas" : "Separate bands"}
					</button>
				</div>
				<p className="lens-note">
					{es
						? "Perfil esquemático: omite membranas limitantes y detalle de las fibras de Henle. Los huecos de la vista separada no existen en el tejido."
						: "Schematic profile: limiting membranes and Henle-fibre detail are omitted. The separated-view gaps are not spaces in the tissue."}
				</p>
			</div>
		</div>
	);
}
