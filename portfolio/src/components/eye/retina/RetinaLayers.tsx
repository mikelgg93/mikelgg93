import ParameterControl, { useInitialParameters } from "../ParameterControl";
import "../lens/lens.css";
import "./retina.css";
import { useState } from "react";
import { useViewerDebug } from "../useViewerDebug";
import RetinalCells from "./RetinalCells";
import { layerBounds, retinalLayers } from "./retinaModel";

export default function RetinaLayers({ lang = "en" }: { lang?: "en" | "es" }) {
	const es = lang === "es",
		[pit, setPit] = useState(false);
	const separate = false;
	const root = useViewerDebug({
		model: "Grouped retinal layers; illustrative drawing units",
		fovea: pit,
		separated: separate,
		centralBands: layerBounds(0, pit, separate),
	});
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
	const defaults = useInitialParameters(
		{ pit, separate },
		(initial) => {
			setPit(initial.pit);
		},
		root,
	);
	return (
		<div ref={root} className="lens-demo retina-demo">
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
					<g key={layer.en}>
						<path
							d={bandPath(i)}
							fill={layer.color}
							stroke="#061e20"
							strokeWidth="1"
						/>
						<text
							x="93"
							y={
								(layerBounds(-0.95, pit, separate)[i]!.top +
									layerBounds(-0.95, pit, separate)[i]!.bottom) /
									2 +
								41
							}
							dominantBaseline="middle"
							fill={i === 6 ? "#ffffff" : "#061e20"}
							fontSize="18"
							fontWeight="bold"
						>
							{i + 1}
						</text>
					</g>
				))}
				<RetinalCells pit={pit} />
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
			<ul
				className="retina-cell-key"
				aria-label={es ? "Tipos celulares" : "Cell types"}
			>
				{[
					[
						"#eee0b5",
						es ? "Bastones / conos" : "Rods / cones",
						"M8 3v16m8-16 4 16 4-16Z",
					],
					[
						"#d5efe3",
						es ? "Bipolares" : "Bipolar",
						"M16 2v20m-5-20h10m-5 20h10",
					],
					[
						"#f5ceb9",
						es ? "Ganglionares" : "Ganglion",
						"M4 21l12-9 12 9M16 12V4h14",
					],
					[
						"#c6c9ee",
						es ? "Horizontales" : "Horizontal",
						"M3 18h26M16 18V7m-7 0h14",
					],
					[
						"#c6c9ee",
						es ? "Amacrinas" : "Amacrine",
						"M16 6v8m-12 6 12-6 12 6m-18 0 6-6 6 6",
					],
					[
						"#80b3a4",
						es ? "Glía de Müller" : "Müller glia",
						"M8 2q15 10 0 20M3 2h10M3 22h10",
					],
				].map(([color, label, d]) => (
					<li key={label}>
						<svg viewBox="0 0 32 24" aria-hidden="true">
							<path d={d} stroke={color} fill="none" strokeWidth="2" />
							<circle cx="16" cy="10" r="3" fill={color} />
						</svg>
						{label}
					</li>
				))}
			</ul>
			<p className="lens-note">
				{es
					? "Conos y bastones → bipolares → ganglionares. Horizontales y amacrinas conectan lateralmente; la glía de Müller sostiene el tejido, también en la fóvea. Su especialización central no se detalla aquí."
					: "Rods and cones → bipolar → ganglion cells. Horizontal and amacrine cells connect laterally; Müller glia support the tissue, including the fovea. Their specialised central organisation is not detailed here."}
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
					<ParameterControl
						hideReset
						value={pit}
						initial={defaults.pit}
						onReset={setPit}
						label="foveal pit view"
						lang={lang}
					>
						<button
							type="button"
							aria-pressed={pit}
							onClick={() => setPit(!pit)}
						>
							{es ? "Mostrar fóvea" : "Show fovea"}
						</button>
					</ParameterControl>
				</div>
				<p className="lens-note">
					{es
						? "Perfil esquemático: omite membranas limitantes y detalle de las fibras de Henle. Las células y conexiones son esquemáticas, no un circuito medido."
						: "Schematic profile: limiting membranes and Henle-fibre detail are omitted. Cell shapes and connections are schematic, not a measured circuit."}
				</p>
			</div>
		</div>
	);
}
