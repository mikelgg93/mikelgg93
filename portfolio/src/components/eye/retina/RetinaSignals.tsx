import { useState } from "react";
import RetinaReceptiveField from "./RetinaReceptiveField";
import RetinaSampling from "./RetinaSampling";
export default function RetinaSignals({ lang = "en" }: { lang?: "en" | "es" }) {
	const [experiment, setExperiment] = useState("sampling"),
		es = lang === "es";
	return (
		<div className="retina-experience">
			<div className="lens-heading">
				<strong>{es ? "De la luz a la señal" : "From light to signals"}</strong>
				<label>
					{es ? "Explorar" : "Explore"}{" "}
					<select
						value={experiment}
						onChange={(e) => setExperiment(e.target.value)}
					>
						<option value="sampling">
							{es ? "Muestrear una imagen" : "Sample an image"}
						</option>
						<option value="field">
							{es ? "Combinar las entradas" : "Combine the inputs"}
						</option>
					</select>
				</label>
			</div>
			<p className="retina-reading">
				{experiment === "sampling"
					? es
						? "¿Pueden dos patrones distintos producir las mismas muestras?"
						: "Can different patterns produce the same samples?"
					: es
						? "¿Por qué cambia la respuesta al mover el mismo estímulo?"
						: "Why does moving the same stimulus change the response?"}
			</p>
			{experiment === "sampling" ? (
				<RetinaSampling lang={lang} />
			) : (
				<RetinaReceptiveField lang={lang} />
			)}
		</div>
	);
}
