import { Canvas, useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { observeVisibility } from "./eye/visibility";

if (typeof window !== "undefined") {
	gsap.registerPlugin(ScrollTrigger);
}

function Eye({
	scrollRef,
	isDark,
	isMobile,
	active,
	reducedMotion,
	auto,
	onComplete,
}: {
	scrollRef: React.MutableRefObject<number>;
	isDark: boolean;
	isMobile: boolean;
	active: boolean;
	reducedMotion: boolean;
	auto: boolean;
	onComplete: () => void;
}) {
	const groupRef = useRef<THREE.Group>(null);

	const resumed = useRef(true);
	const finished = useRef(false);
	useEffect(() => {
		resumed.current = true;
	}, [active]);
	useFrame((state, frameDelta) => {
		const delta = resumed.current ? 0 : Math.min(frameDelta, 0.05);
		resumed.current = false;
		if (auto && !reducedMotion && !finished.current) {
			// The original is scroll-driven, so it has no fixed duration. The 404
			// traverses that same camera path over six seconds of visible time.
			scrollRef.current = Math.min(1, scrollRef.current + delta / 6);
			if (scrollRef.current >= 1) {
				finished.current = true;
				onComplete();
			}
		}
		if (groupRef.current) {
			const progress = scrollRef.current;

			const lockWeight = 1 - Math.min(progress * 4, 1);

			const targetX = reducedMotion
				? 0
				: ((state.pointer.x * Math.PI) / 3) * lockWeight;
			const targetY = reducedMotion
				? 0
				: ((state.pointer.y * Math.PI) / 3) * lockWeight;

			groupRef.current.rotation.y = THREE.MathUtils.damp(
				groupRef.current.rotation.y,
				targetX,
				5,
				delta,
			);
			groupRef.current.rotation.x = THREE.MathUtils.damp(
				groupRef.current.rotation.x,
				-targetY,
				5,
				delta,
			);

			const startX = isMobile ? 3 : 2;
			const startY = isMobile ? 2 : 1.5;
			const startZ = isMobile ? 7 : 4.5;

			const endZ = 0.2;

			const curvedProgress = progress ** 3;

			const cx = startX * lockWeight;
			const cy = startY * lockWeight;
			const cz = startZ - (startZ - endZ) * curvedProgress;

			state.camera.position.set(cx, cy, cz);
			state.camera.lookAt(0, 0, 0);
		}
	});

	return (
		<group ref={groupRef}>
			<mesh>
				<icosahedronGeometry args={[1, 5]} />
				<meshBasicMaterial
					color={isDark ? "#d4d4d8" : "#3f3f46"}
					wireframe={true}
					transparent
					opacity={isDark ? 0.6 : 0.4}
				/>
			</mesh>

			<mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={1}>
				<sphereGeometry args={[1.02, 32, 32, 0, Math.PI * 2, 0, 0.5]} />
				<meshStandardMaterial
					color={isDark ? "#a1a1aa" : "#52525b"}
					roughness={0.9}
					transparent
					opacity={0.6}
					depthWrite={false}
				/>
			</mesh>

			<mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={2}>
				<sphereGeometry args={[1.025, 32, 32, 0, Math.PI * 2, 0, 0.15]} />
				<meshBasicMaterial color="#000000" />
			</mesh>
		</group>
	);
}

export default function WebGLEye({
	title,
	caption,
	mode = "scroll",
	destination,
}: {
	title?: string;
	caption?: string;
	mode?: "scroll" | "auto";
	destination?: string;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const scrollRef = useRef<number>(0);
	const [isDark, setIsDark] = React.useState(true);
	const [active, setActive] = React.useState(false);
	const [reducedMotion, setReducedMotion] = React.useState(false);
	const [failed, setFailed] = React.useState(false);
	const goHome = () => {
		const target =
			destination ??
			(location.pathname.startsWith("/es") ? "/es/blog" : "/blog");
		if (location.pathname !== target) location.replace(target);
	};

	const [isMobile, setIsMobile] = React.useState(
		typeof window !== "undefined"
			? window.matchMedia("(max-width: 768px)").matches
			: false,
	);

	useEffect(() => {
		setIsDark(document.documentElement.classList.contains("dark"));
		const observer = new MutationObserver(() => {
			setIsDark(document.documentElement.classList.contains("dark"));
		});
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});

		const mediaQuery = window.matchMedia("(max-width: 768px)");
		const handleMediaChange = (e: MediaQueryListEvent) =>
			setIsMobile(e.matches);
		mediaQuery.addEventListener("change", handleMediaChange);

		const motion = matchMedia("(prefers-reduced-motion: reduce)");
		const motionChanged = () => setReducedMotion(motion.matches);
		motionChanged();
		motion.addEventListener("change", motionChanged);
		const stopVisibility = containerRef.current
			? observeVisibility(containerRef.current, setActive)
			: () => {};

		let triggered = false;
		const ctx = gsap.context(() => {
			if (mode !== "scroll" || motion.matches || failed) return;
			ScrollTrigger.create({
				trigger: containerRef.current,
				start: "center center",
				end: "+=250%",
				pin: true,
				scrub: 1.5,
				onUpdate: (self) => {
					scrollRef.current = self.progress;

					if (self.progress > 0.95 && !triggered) {
						triggered = true;
						const isEs = window.location.pathname.startsWith("/es");
						window.location.href = isEs ? "/es/blog" : "/blog";
					}
				},
			});
		}, containerRef);

		return () => {
			ctx.revert();
			observer.disconnect();
			mediaQuery.removeEventListener("change", handleMediaChange);
			motion.removeEventListener("change", motionChanged);
			stopVisibility();
		};
	}, [mode, failed, reducedMotion]);

	return (
		<div
			ref={containerRef}
			className="h-[50vh] min-h-[400px] bg-transparent relative my-16"
			style={{ width: "90vw", marginLeft: "calc(50% - 45vw)" }}
		>
			{mode === "auto" && reducedMotion ? (
				<p className="text-center text-muted-foreground pt-16">
					The page is missing. The home link above will take you back.
				</p>
			) : (
				<EyeFallback onError={() => setFailed(true)}>
					<Canvas
						frameloop={active ? (reducedMotion ? "demand" : "always") : "never"}
						fallback={
							<p className="text-center p-8">
								WebGL is unavailable. Use the page links to continue.
							</p>
						}
						camera={{ position: [1.5, 1.5, 3.5], fov: isMobile ? 20 : 30 }}
						className="w-full h-full"
					>
						<ambientLight intensity={1} />
						<directionalLight position={[0, 0, 5]} intensity={1.5} />
						<Eye
							scrollRef={scrollRef}
							isDark={isDark}
							isMobile={isMobile}
							active={active}
							reducedMotion={reducedMotion}
							auto={mode === "auto"}
							onComplete={goHome}
						/>
					</Canvas>
				</EyeFallback>
			)}

			{caption && (
				<span className="italic text-muted-foreground mt-6 block text-center opacity-80 z-20">
					{caption}
				</span>
			)}

			{title && (
				<div className="absolute -bottom-40 w-full text-center font-serif z-10 prose dark:prose-invert">
					<h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-0">
						{title}
					</h2>
				</div>
			)}
		</div>
	);
}

class EyeFallback extends React.Component<
	{ children: React.ReactNode; onError: () => void },
	{ failed: boolean }
> {
	override state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	override componentDidCatch() {
		this.props.onError();
	}
	override render() {
		return this.state.failed ? (
			<p className="text-center p-8">
				The eye could not be displayed. Use the page links to continue.
			</p>
		) : (
			this.props.children
		);
	}
}
