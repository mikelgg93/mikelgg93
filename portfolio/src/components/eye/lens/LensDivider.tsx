export default function LensDivider({
	value,
	onChange,
	label,
}: {
	value: number;
	onChange: (value: number) => void;
	label: string;
}) {
	return (
		<button
			type="button"
			role="slider"
			aria-label={label}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(value * 100)}
			aria-valuetext={`${Math.round(value * 100)}%`}
			className="lens-map-divider"
			style={{ left: `${value * 100}%` }}
			onKeyDown={(e) => {
				const next =
					e.key === "Home"
						? 0
						: e.key === "End"
							? 1
							: e.key === "ArrowLeft"
								? value - 0.05
								: e.key === "ArrowRight"
									? value + 0.05
									: null;
				if (next !== null) {
					e.preventDefault();
					onChange(Math.max(0, Math.min(1, next)));
				}
			}}
			onPointerDown={(e) => {
				e.stopPropagation();
				e.currentTarget.setPointerCapture(e.pointerId);
			}}
			onPointerMove={(e) => {
				if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
				const rect = e.currentTarget.parentElement!.getBoundingClientRect();
				onChange(
					Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
				);
			}}
			onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
		>
			<span aria-hidden="true">↔</span>
		</button>
	);
}
