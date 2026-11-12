import { layerBounds } from "./retinaModel";

/** Cell icons follow their compartments; connections are deliberately schematic. */
export default function RetinalCells({ pit }: { pit: boolean }) {
	const targetX = 432;
	const bands = layerBounds(0.6, pit, false);
	const at = (n: number) => (bands[n]!.top + bands[n]!.bottom) / 2 + 40;
	const selected = pit ? [0] : [-0.4, 0, 0.4];
	return (
		<g stroke="#173c3a" strokeWidth="1.5">
			{Array.from({ length: 13 }, (_, i) => {
				const x = -0.8 + i * 0.1333,
					px = 80 + (x + 1) * 220;
				const bands = layerBounds(x, pit, false);
				const glia = layerBounds(x - 10 / 220, pit, false);
				const mid = (n: number) => (bands[n]!.top + bands[n]!.bottom) / 2 + 40;
				const cone = (pit && Math.abs(x) < 0.3) || i % 3 === 0;
				const inner = !pit || Math.abs(x) > 0.32;
				const narrow = pit && Math.abs(x) < 0.3,
					width = narrow ? 2 : 4,
					length = narrow ? 27 : 18;
				return (
					<g key={i}>
						<path d={`M${px} ${mid(4)}V${mid(5)}`} fill="none" />
						<ellipse
							cx={px}
							cy={mid(4)}
							rx={narrow ? 2.5 : 4}
							ry="7"
							fill="#eee0b5"
						/>
						{cone ? (
							<path
								d={`M${px - width} ${mid(5) - length / 2}l${width} ${length} ${width}-${length}Z`}
								fill="#edd2a1"
							/>
						) : (
							<rect
								x={px - 2.5}
								y={mid(5) - 8}
								width="5"
								height="18"
								rx="2"
								fill="#d8e7dc"
							/>
						)}
						{(i % 4 === 0 || (pit && i === 6)) && (
							<g>
								<path
									d={`M${px - 10} ${glia[0]!.top + 40}V${glia[5]!.top + 40}m-4 0h8M${px - 15} ${glia[0]!.top + 40}h10`}
									stroke="#80b3a4"
									strokeWidth="4"
									opacity=".7"
									fill="none"
								/>
								{inner && (
									<ellipse
										cx={px - 10}
										cy={(glia[2]!.top + glia[2]!.bottom) / 2 + 40}
										rx="3"
										ry="6"
										fill="#80b3a4"
									/>
								)}
							</g>
						)}
					</g>
				);
			})}
			<g stroke="#fff1be" strokeWidth="2" fill="none">
				{selected.map((x) => {
					const source = layerBounds(x, pit, false)[4]!;
					const px = 80 + (x + 1) * 220;
					return (
						<path
							key={x}
							d={`M${px} ${(source.top + source.bottom) / 2 + 40}Q${px} ${at(3)} ${targetX} ${at(3)}`}
						/>
					);
				})}
				<path
					d={`M${targetX - 5} ${at(3)}h10M${targetX} ${at(3)}V${at(1)}m-8 0h16M${targetX} ${at(1)}Q${targetX + 22} ${at(1)} ${targetX + 22} ${at(0)}h42`}
				/>
				<ellipse cx={targetX} cy={at(2)} rx="4" ry="6" fill="#d5efe3" />
				<circle cx={targetX + 22} cy={at(0)} r="6" fill="#f5ceb9" />
				<path d={`M${targetX + 56} ${at(0) - 4}l8 4-8 4`} />
			</g>
			<g stroke="#c6c9ee" fill="#c6c9ee">
				<ellipse cx="380" cy={at(2) + 7} rx="7" ry="3" />
				<path
					d={`M380 ${at(2) + 7}V${at(3) + 5}H460M350 ${at(3) + 5}h30`}
					fill="none"
				/>
				<circle cx="492" cy={at(2) - 5} r="4" />
				<path d={`M492 ${at(2) - 5}V${at(1) + 5}H416`} fill="none" />
			</g>
		</g>
	);
}
