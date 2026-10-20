import { layerBounds } from "./retinaModel";

/** Cell icons follow their compartments; connections are deliberately schematic. */
export default function RetinalCells({ pit }: { pit: boolean }) {
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
				return (
					<g key={i}>
						<path d={`M${px} ${mid(4)}V${mid(5)}`} fill="none" />
						<ellipse cx={px} cy={mid(4)} rx="4" ry="7" fill="#eee0b5" />
						{cone ? (
							<path d={`M${px - 4} ${mid(5) - 8}l4 18 4-18Z`} fill="#edd2a1" />
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
						{inner && (
							<>
								<path
									d={`M${px} ${mid(3)}V${mid(1)}m-7 0h14M${px - 7} ${mid(3)}h14`}
									fill="none"
								/>
								<ellipse cx={px} cy={mid(2)} rx="4" ry="6" fill="#d5efe3" />
								<path
									d={`M${px} ${mid(1)}l-8 4m8-4 8 4m-8-4V${mid(0)}h18`}
									fill="none"
								/>
								<circle cx={px} cy={mid(0)} r="5" fill="#f5ceb9" />
								{i % 3 === 0 && (
									<>
										<ellipse
											cx={px + 10}
											cy={mid(2) + 8}
											rx="6"
											ry="3"
											fill="#c6c9ee"
										/>
										<path
											d={`M${px + 10} ${mid(2) + 8}V${mid(3)}m-19 0h37`}
											fill="none"
										/>
										<circle cx={px + 12} cy={mid(2) - 8} r="4" fill="#c6c9ee" />
										<path
											d={`M${px + 12} ${mid(2) - 8}V${mid(1)}m-8 0h22`}
											fill="none"
										/>
									</>
								)}
							</>
						)}
						{(i % 4 === 0 || (pit && i === 6)) && (
							<path
								d={`M${px - 10} ${glia[0]!.top + 40}V${glia[5]!.bottom + 40}`}
								stroke="#80b3a4"
								strokeWidth="4"
								opacity=".7"
								fill="none"
							/>
						)}
					</g>
				);
			})}
		</g>
	);
}
