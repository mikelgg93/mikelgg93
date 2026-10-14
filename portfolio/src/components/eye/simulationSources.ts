// Build-time Code-tab dependencies, shared with the later articles' source lists.
import controls from "./ParameterControl.tsx?raw";
import styles from "./parameter-control.css?raw";
import context from "./parameterContext.ts?raw";
import debug from "./useViewerDebug.ts?raw";
import visibility from "./visibility.ts?raw";

export const simulationSources = [
	{ path: "eye/ParameterControl.tsx", code: controls, lang: "tsx" as const },
	{ path: "eye/parameter-control.css", code: styles, lang: "css" as const },
	{ path: "eye/parameterContext.ts", code: context, lang: "ts" as const },
	{ path: "eye/useViewerDebug.ts", code: debug, lang: "ts" as const },
	{ path: "eye/visibility.ts", code: visibility, lang: "ts" as const },
];
