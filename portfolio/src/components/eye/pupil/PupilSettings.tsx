import { ChevronDown, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";

export default function PupilSettings({
	children,
	lang = "en",
}: {
	children: ReactNode;
	lang?: "en" | "es";
}) {
	return (
		<details className="pupil-controls pupil-settings">
			<summary>
				<SlidersHorizontal size={14} aria-hidden="true" />
				<span>{lang === "es" ? "Ajustes" : "Settings"}</span>
				<ChevronDown size={14} aria-hidden="true" />
			</summary>
			<div className="pupil-settings-body">{children}</div>
		</details>
	);
}
