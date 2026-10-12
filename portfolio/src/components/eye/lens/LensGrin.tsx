import "./lens.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { GRIN_EDGE_INDEX, traceGrinRay } from "./lensOptics";

const HEIGHTS = [-3.2, -2.1, -1, 0, 1, 2.1, 3.2];
const project = (points: { x: number; y: number }[]) =>
	points
		.map(
			(p, i) =>
				`${i ? "L" : "M"}${(160 + 30 * p.x).toFixed(3)} ${(150 - 27 * p.y).toFixed(3)}`,
		)
		.join(" ");
const uniformTraces = HEIGHTS.map((y) => traceGrinRay(y, 0));
const uniformRays = uniformTraces.map((ray) => project(ray.points));

export default function LensGrin({ lang = "en" }: { lang?: "en" | "es" }) {
	const es = lang === "es";
	const root = useRef<HTMLDivElement>(null);
	const [gradient, setGradient] = useState(0.05);
	const rays = useMemo(
		() => HEIGHTS.map((y) => traceGrinRay(y, gradient)),
		[gradient],
	);
	useEffect(() => {
		const debug = root.current
			?.closest(".interactive-viewer")
			?.querySelector(".debug-output");
		if (debug)
			debug.textContent = JSON.stringify(
				{
					model:
						"2D quadratic GRIN; Snell surfaces and continuous internal ray integration",
					edgeIndex: GRIN_EDGE_INDEX,
					centralIndex: GRIN_EDGE_INDEX + gradient,
					allRaysExit: rays.every((ray) => ray.complete),
				},
				null,
				2,
			);
	}, [gradient, rays]);
	return (
		<div className="lens-demo" ref={root}>
			<div className="lens-heading">
				<strong>
					{es
						? "La luz también se curva por dentro"
						: "Light bends inside, too"}
				</strong>
				<span className="lens-muted">
					{es ? "Sección meridional del cristalino" : "Meridional lens section"}
				</span>
			</div>
			<svg
				className="lens-rays"
				viewBox="0 0 400 300"
				role="img"
				aria-label={
					es
						? "Rayos en una lente con gradiente de índice, comparados con una lente uniforme"
						: "Rays in a gradient-index lens compared with a uniform lens"
				}
			>
				<path d="M 8 150 H 387" stroke="#365d5a" strokeDasharray="3 6" />
				{Array.from({ length: 30 }, (_, i) => {
					const r = 1 - i / 30;
					const weight = ((1 - r * r) * gradient) / 0.06;
					return (
						<ellipse
							key={i}
							cx="160"
							cy="150"
							rx={60 * r}
							ry={121.5 * r}
							fill={`rgb(${Math.round(26 + 184 * weight)}, ${Math.round(83 + 106 * weight)}, ${Math.round(88 + 30 * weight)})`}
						/>
					);
				})}
				{[1, 0.75, 0.5, 0.25].map((r) => (
					<ellipse
						key={r}
						cx="160"
						cy="150"
						rx={60 * r}
						ry={121.5 * r}
						fill="none"
						stroke="#b0f3df"
						opacity={r === 1 ? 0.7 : gradient / 0.2}
						strokeWidth="0.8"
					/>
				))}
				{uniformRays.map((d, i) => (
					<path
						key={HEIGHTS[i]}
						d={d}
						fill="none"
						stroke="#c4d5d5"
						strokeDasharray="3 4"
						strokeWidth={i === HEIGHTS.length - 1 ? 1.8 : 1}
						opacity={i === HEIGHTS.length - 1 ? 1 : 0.35}
					/>
				))}
				{rays.map((ray, i) => (
					<path
						key={HEIGHTS[i]}
						d={project(ray.points)}
						fill="none"
						stroke="#ffd493"
						strokeWidth={i === HEIGHTS.length - 1 ? 2.6 : 1.2}
						opacity={i === HEIGHTS.length - 1 ? 1 : 0.45}
					/>
				))}
				<text x="160" y="18" fill="#c0e1da" fontSize="14" textAnchor="middle">
					{gradient === 0
						? es
							? "Índice de refracción uniforme"
							: "Uniform refractive index"
						: es
							? "Índice mayor hacia el centro"
							: "Higher index toward the centre"}
				</text>
				<text x="200" y="292" fill="#a9c8c2" fontSize="13" textAnchor="middle">
					{es
						? "Escala axial ampliada · lente aislada"
						: "Axial scale expanded · isolated lens"}
				</text>
			</svg>
			<div className="lens-legend">
				<span>
					{es ? "Discontinuo: n uniforme = 1,370" : "Dashed: uniform n = 1.370"}
				</span>
				<span>
					{es ? "Dorado: perfil seleccionado" : "Gold: selected profile"}
				</span>
			</div>
			<div className="lens-controls">
				<p className="lens-note">
					{gradient === 0
						? es
							? "Los dos trazados se superponen: el interior tiene un único índice."
							: "The two paths overlap: the interior has one uniform index."
						: es
							? "Sigue el rayo superior resaltado y compara su extremo dorado con el discontinuo de la derecha. El gradiente añade curvatura dentro de la lente."
							: "Follow the highlighted upper ray and compare its golden tip with the dashed path on the right. The gradient adds bending inside the lens."}
				</p>
				<label>
					<span className="lens-value">
						<span>
							{es ? "Incremento del índice central" : "Central index increase"}
						</span>
						<output>{gradient.toFixed(3)}</output>
					</span>
					<input
						type="range"
						min="0"
						max="0.06"
						step="0.001"
						value={gradient}
						onChange={(e) => setGradient(Number(e.target.value))}
					/>
				</label>
				<div className="lens-value">
					<span>
						{es ? "Borde" : "Edge"}: {GRIN_EDGE_INDEX.toFixed(3)}
					</span>
					<span>
						{es ? "Centro" : "Centre"}:{" "}
						{(GRIN_EDGE_INDEX + gradient).toFixed(3)}
					</span>
				</div>
				<div className="lens-buttons">
					<button
						type="button"
						aria-pressed={gradient === 0}
						onClick={() => setGradient(0)}
					>
						{es ? "Uniforme" : "Uniform"}
					</button>
					<button
						type="button"
						aria-pressed={gradient === 0.05}
						onClick={() => setGradient(0.05)}
					>
						GRIN
					</button>
				</div>
				<p className="lens-note">
					{es
						? "Perfil cuadrático e índices elegidos para el modelo, no mediciones individuales. Los colores representan el índice; los contornos no son capas anatómicas."
						: "Quadratic profile and indices chosen for the model, not individual measurements. Colours encode index; contours are not anatomical layers."}
				</p>
			</div>
		</div>
	);
}
