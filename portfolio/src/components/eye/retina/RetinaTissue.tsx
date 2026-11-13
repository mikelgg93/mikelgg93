import { useEffect, useRef, useState } from "react";
import { createLensScene } from "../lens/lensScene";
import { createChoroidPatch } from "./choroidPatch";
import RetinaLayers from "./RetinaLayers";
import RetinaMosaic from "./RetinaMosaic";

function ChoroidDetail({
	lang,
	tessellated,
}: {
	lang: "en" | "es";
	tessellated: boolean;
}) {
	const mount = useRef<HTMLDivElement>(null),
		[error, setError] = useState(false);
	useEffect(() => {
		if (!mount.current) return;
		let view: ReturnType<typeof createLensScene>;
		try {
			view = createLensScene(mount.current, 22, lang);
		} catch {
			setError(true);
			return;
		}
		view.camera.position.set(3, 2, 4);
		view.controls.target.set(0, 0, -18.7);
		const patch = createChoroidPatch();
		view.scene.add(patch.group);
		patch.update(tessellated);
		view.start(() => ({
			state: { model: "Magnified illustrative choroidal patch", tessellated },
		}));
		return () => view.dispose();
	}, [lang, tessellated]);
	return (
		<div className="lens-demo retina-demo">
			<div
				ref={mount}
				className="lens-scene"
				role="img"
				aria-label={
					lang === "es"
						? "Detalle coroideo ampliado"
						: "Magnified choroidal detail"
				}
			>
				{error && (
					<p role="status">
						WebGL {lang === "es" ? "no disponible" : "unavailable"}
					</p>
				)}
			</div>
			<p className="retina-reading">
				{lang === "es"
					? "La red capilar queda junto al EPR; los vasos mayores están más profundos. Tamaños y transparencia ilustrativos."
					: "The capillary sheet lies beside the RPE; larger vessels lie deeper. Sizes and transparency are illustrative."}
			</p>
		</div>
	);
}
export default function RetinaTissue({ lang = "en" }: { lang?: "en" | "es" }) {
	const [detail, setDetail] = useState("section"),
		es = lang === "es";
	return (
		<div className="retina-experience">
			<div className="lens-heading">
				<strong>{es ? "Dentro de la pared" : "Inside the wall"}</strong>
				<label>
					{es ? "Ampliar" : "Magnify"}{" "}
					<select value={detail} onChange={(e) => setDetail(e.target.value)}>
						<option value="section">
							{es ? "Sección y fóvea" : "Section and fovea"}
						</option>
						<option value="receptors">
							{es ? "Bastones y conos" : "Rods and cones"}
						</option>
						<option value="choroid">
							{es ? "Vasos de la coroides" : "Choroidal vessels"}
						</option>
						<option value="tessellation">
							{es ? "Patrón coroideo visible" : "Visible choroidal pattern"}
						</option>
					</select>
				</label>
			</div>
			<p className="retina-reading">
				{es
					? "Pasamos del globo a diagramas ampliados: la sección localiza las células; las otras vistas acercan los receptores o la coroides. No comparten la escala milimétrica del ojo completo."
					: "We move from the globe to magnified diagrams: the section locates the cells; the other views inspect receptors or choroid. These do not share the whole eye’s millimetre scale."}
			</p>
			{detail === "section" ? (
				<RetinaLayers lang={lang} />
			) : detail === "receptors" ? (
				<RetinaMosaic lang={lang} />
			) : (
				<ChoroidDetail lang={lang} tessellated={detail === "tessellation"} />
			)}
		</div>
	);
}
