import type { LensView } from "./lensScene";

export default function LensViews({
	lang,
	onView,
	section = false,
}: {
	lang: "en" | "es";
	onView: (view: LensView) => void;
	section?: boolean;
}) {
	const es = lang === "es";
	return (
		<details className="lens-camera-views">
			<summary>{es ? "Vistas de cámara" : "Camera views"}</summary>
			<label>
				<span className="sr-only">{es ? "Elegir vista" : "Choose view"}</span>
				<select
					defaultValue=""
					onChange={(e) => {
						onView(e.target.value as LensView);
						e.target.value = ""; // Repeatable camera actions after orbiting.
					}}
				>
					<option value="" disabled>
						{es ? "Elegir vista…" : "Choose view…"}
					</option>
					{section && (
						<option value="section">
							{es ? "Ver el corte" : "Face the section"}
						</option>
					)}
					<option value="front">{es ? "Vista anterior" : "Front view"}</option>
					<option value="side">{es ? "Vista lateral" : "Side view"}</option>
					<option value="back">{es ? "Vista posterior" : "Back view"}</option>
					<option value="reset">
						{es ? "Restablecer vista" : "Reset view"}
					</option>
				</select>
			</label>
			<p className="lens-note">
				{es
					? "Anterior: hacia la córnea · Posterior: hacia la retina."
					: "Front: toward the cornea · Back: toward the retina."}
			</p>
		</details>
	);
}
