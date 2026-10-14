export function isTypingTarget(target: EventTarget | null) {
	return (
		target instanceof Element &&
		Boolean(
			target.closest(
				'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], .monaco-editor, .cm-editor, .CodeMirror',
			),
		)
	);
}

export function blocksPageShortcut(target: EventTarget | null) {
	return (
		isTypingTarget(target) ||
		(target instanceof Element &&
			Boolean(
				target.closest(
					'button, a, canvas, [role="slider"], [role="tablist"], [role="dialog"], dialog, [popover]',
				),
			))
	);
}
