import type { LensView } from "./lensScene";

export default function LensViews({
	lang,
	onView,
}: {
	lang: "en" | "es";
	onView: (view: LensView) => void;
}) {
	const es = lang === "es";
	return (
		<details className="lens-camera-views">
			<summary>{es ? "Vistas de cámara" : "Camera views"}</summary>
			<div
				className="lens-buttons"
				role="group"
				aria-label={es ? "Vistas de cámara" : "Camera views"}
			>
				{(["front", "side", "back", "reset"] as const).map((view, i) => (
					<button type="button" key={view} onClick={() => onView(view)}>
						{
							(es
								? [
										"Vista anterior",
										"Vista lateral",
										"Vista posterior",
										"Restablecer vista",
									]
								: ["Front view", "Side view", "Back view", "Reset view"])[i]
						}
					</button>
				))}
			</div>
			<p className="lens-note">
				{es
					? "Anterior: hacia la córnea · Posterior: hacia la retina."
					: "Front: toward the cornea · Back: toward the retina."}
			</p>
		</details>
	);
}
