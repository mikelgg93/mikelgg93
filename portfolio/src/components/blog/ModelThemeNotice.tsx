import { useState } from "react";

export default function ModelThemeNotice({ lang }: { lang: "en" | "es" }) {
	const [dismissed, setDismissed] = useState(false);
	if (dismissed) return null;
	const es = lang === "es";
	return (
		<aside
			aria-label={es ? "Consejo de visualización" : "Viewing tip"}
			className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-1/2 z-40 flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-card/95 py-2 pl-4 pr-1 text-xs text-foreground shadow-sm backdrop-blur-md dark:hidden"
		>
			<p>
				{es
					? "Algunos modelos 3D se aprecian mejor en modo oscuro."
					: "Some 3D models are best viewed in dark mode."}
			</p>
			<button
				type="button"
				onClick={() => setDismissed(true)}
				aria-label={es ? "Cerrar aviso" : "Dismiss notice"}
				className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-lg text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
			>
				<span aria-hidden="true">×</span>
			</button>
		</aside>
	);
}
