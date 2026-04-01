import { Canvas, useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

function Eye({
  scrollRef,
  isDark,
  isMobile,
}: {
  scrollRef: React.MutableRefObject<number>;
  isDark: boolean;
  isMobile: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      const progress = scrollRef.current;

      const lockWeight = 1 - Math.min(progress * 4, 1);

      const targetX = ((state.pointer.x * Math.PI) / 3) * lockWeight;
      const targetY = ((state.pointer.y * Math.PI) / 3) * lockWeight;

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

      const curvedProgress = Math.pow(progress, 3);

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
}: {
  title?: string;
  caption?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<number>(0);
  const [isDark, setIsDark] = React.useState(true);

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

    if (!containerRef.current) return;

    let triggered = false;
    const ctx = gsap.context(() => {
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

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-[50vh] min-h-[400px] bg-transparent relative my-16"
      style={{ width: "90vw", marginLeft: "calc(50% - 45vw)" }}
    >
      <Canvas
        camera={{ position: [1.5, 1.5, 3.5], fov: isMobile ? 20 : 30 }}
        className="w-full h-full"
      >
        <ambientLight intensity={1} />
        <directionalLight position={[0, 0, 5]} intensity={1.5} />
        <Eye scrollRef={scrollRef} isDark={isDark} isMobile={isMobile} />
      </Canvas>

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
