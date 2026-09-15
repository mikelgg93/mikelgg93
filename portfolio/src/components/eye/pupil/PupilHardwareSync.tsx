import React, { useEffect, useRef, useState } from "react";
import { createIrisScene, type IrisScene } from "./irisScene";

export default function PupilHardwareSync() {
	const mountRef = useRef<HTMLDivElement>(null);
	const sceneRef = useRef<IrisScene | null>(null);
	const [deviceIp, setDeviceIp] = useState("192.168.18.39");
	const [status, setStatus] = useState<
		"disconnected" | "connecting" | "connected"
	>("disconnected");
	const [errorMsg, setErrorMsg] = useState("");
	const [pupilMm, setPupilMm] = useState<number>(3.0);

	const scriptRef = useRef<HTMLScriptElement | null>(null);
	const originalWsRef = useRef<any>(null);
	const dummyRootRef = useRef<HTMLDivElement | null>(null);

	// Graph state
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const historyRef = useRef<number[]>(Array(100).fill(3.0));

	useEffect(() => {
		if (!mountRef.current) return;
		sceneRef.current = createIrisScene(mountRef.current, {
			pupilRadius: 3.0 / 24,
			pigmentation: 1,
			showMuscles: false,
			stilesCrawford: false,
		});

		return () => {
			if (sceneRef.current) {
				sceneRef.current.dispose();
				sceneRef.current = null;
			}
			cleanupSandbox();
		};
	}, []);

	const updateGraph = (val: number) => {
		const history = historyRef.current;
		history.push(val);
		if (history.length > 100) history.shift();

		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const w = canvas.width;
		const h = canvas.height;
		ctx.clearRect(0, 0, w, h);

		ctx.beginPath();
		ctx.strokeStyle = "#10b981"; // emerald-500
		ctx.lineWidth = 2;

		for (let i = 0; i < history.length; i++) {
			const x = (i / (history.length - 1)) * w;
			// Map diameter from 1mm-9mm to canvas height
			const y = h - ((history[i] - 1) / 8) * h;
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();
	};

	const cleanupSandbox = () => {
		if (originalWsRef.current) {
			window.WebSocket = originalWsRef.current;
			originalWsRef.current = null;
		}
		if (scriptRef.current && scriptRef.current.parentNode) {
			scriptRef.current.parentNode.removeChild(scriptRef.current);
			scriptRef.current = null;
		}
		if (dummyRootRef.current && dummyRootRef.current.parentNode) {
			dummyRootRef.current.parentNode.removeChild(dummyRootRef.current);
			dummyRootRef.current = null;
		}
		setStatus("disconnected");
	};

	const toggleConnection = async () => {
		if (status === "connected" || status === "connecting") {
			cleanupSandbox();
			return;
		}

		setStatus("connecting");
		setErrorMsg("");
		try {
			// 1. Create a hidden dummy root for the Neon app to mount to
			const dummyRoot = document.createElement("div");
			dummyRoot.id = "neon-dummy-root";
			dummyRoot.style.display = "none";
			document.body.appendChild(dummyRoot);
			dummyRootRef.current = dummyRoot;

			// 2. Intercept WebSocket globally to steal the gaze data using ES6 Class extending Original WS
			originalWsRef.current = window.WebSocket;

			class InterceptedWebSocket extends originalWsRef.current {
				constructor(url: string, protocols?: string | string[]) {
					super(url, protocols);

					// Only scan websockets going to our device that aren't the JSON status endpoints
					if (url.includes(deviceIp) && !url.includes("status")) {
						setStatus("connected"); // The app successfully started a stream!

						this.addEventListener("message", (event: MessageEvent) => {
							if (typeof event.data === "string") return;
							const buffer = new Uint8Array(event.data);
							if (buffer[0] !== 0x24) return; // Must be interleaved binary packet

							const rtpHeaderSize = 12;
							const payloadOffset = 4 + rtpHeaderSize;
							if (buffer.length <= payloadOffset) return;

							const targetKey = "pupil_diameter_mm";
							let foundIndex = -1;
							for (
								let i = payloadOffset;
								i < buffer.length - targetKey.length - 8;
								i++
							) {
								if (buffer[i] === 0xb1) {
									let match = true;
									for (let j = 0; j < targetKey.length; j++) {
										if (buffer[i + 1 + j] !== targetKey.charCodeAt(j)) {
											match = false;
											break;
										}
									}
									if (match) {
										foundIndex = i + 1 + targetKey.length;
										break;
									}
								}
							}

							if (foundIndex !== -1 && sceneRef.current) {
								const typeByte = buffer[foundIndex];
								let diameter = 0;
								const dataView = new DataView(buffer.buffer);
								if (typeByte === 0xca) {
									diameter = dataView.getFloat32(foundIndex + 1, false);
								} else if (typeByte === 0xcb) {
									diameter = dataView.getFloat64(foundIndex + 1, false);
								}

								if (diameter > 0 && diameter < 10) {
									sceneRef.current.params.pupilRadius = diameter / 24;
									setPupilMm(diameter);
									updateGraph(diameter);
								}
							}
						});
					}
				}
			}

			// Replace it in window so the injected script uses it
			(window as any).WebSocket = InterceptedWebSocket;

			// 3. Fetch the device's webapp dynamically
			const fetchOpts = {
				headers: { Connection: "close" },
				cache: "no-store" as RequestCache,
			};
			const htmlRes = await fetch(`http://${deviceIp}:8080/`, fetchOpts);
			const html = await htmlRes.text();
			const scriptMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
			if (!scriptMatch)
				throw new Error("Could not find index.js in the Neon device response");

			// 4. Fetch the JS bundle and sandbox its mount point & location
			const jsRes = await fetch(
				`http://${deviceIp}:8080${scriptMatch[1]}`,
				fetchOpts,
			);
			let scriptText = await jsRes.text();

			// Nuke its ability to take over our #root element
			scriptText = scriptText.replace(
				/getElementById\(['"]root['"]\)/g,
				"getElementById('neon-dummy-root')",
			);

			// Force it to connect to the device IP instead of the blog's localhost
			scriptText = scriptText.replace(
				/window\.location\.href/g,
				`("http://${deviceIp}:8080/")`,
			);
			scriptText = scriptText.replace(
				/window\.location\.hostname/g,
				`("${deviceIp}")`,
			);
			scriptText = scriptText.replace(
				/window\.location\.host/g,
				`("${deviceIp}:8080")`,
			);

			// 5. Execute the sandboxed JS
			const script = document.createElement("script");
			script.type = "module";
			script.textContent = scriptText;
			document.body.appendChild(script);
			scriptRef.current = script;
		} catch (e: any) {
			console.error("Neon Connection Error:", e);
			setErrorMsg(
				e.message || "Failed to fetch. Device asleep or cross-origin blocked.",
			);
			cleanupSandbox();
		}
	};

	return (
		<div className="relative w-full h-[500px] md:h-[580px] bg-transparent overflow-hidden rounded-lg group border border-border">
			{/* Overlay */}
			<div className="absolute top-4 left-4 p-3 rounded-xl bg-card/80 backdrop-blur-md border border-border flex flex-col gap-2 z-10 w-64 shadow-xl pointer-events-auto">
				<div className="flex items-center justify-between">
					<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
						Hardware Sync
					</span>
					<div
						className={`w-2.5 h-2.5 rounded-full ${status === "connected" ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : status === "connecting" ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`}
					/>
				</div>
				<input
					type="text"
					value={deviceIp}
					onChange={(e) => setDeviceIp(e.target.value)}
					disabled={status !== "disconnected"}
					className="bg-background/50 border border-input rounded-md px-2 py-1.5 text-[11px] text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring"
				/>
				<button
					type="button"
					onClick={toggleConnection}
					className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors w-full ${status === "connected" ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
				>
					{status === "connected"
						? "Disconnect"
						: status === "connecting"
							? "Connecting App..."
							: "Connect (Background App)"}
				</button>
				<div className="flex items-end justify-between mt-1">
					<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						Diameter
					</span>
					<span className="text-lg font-mono font-bold text-foreground">
						{pupilMm.toFixed(2)}{" "}
						<span className="text-xs font-semibold text-muted-foreground">
							mm
						</span>
					</span>
				</div>
				{errorMsg && (
					<div className="mt-1 text-xs text-red-500 font-semibold bg-red-500/10 p-2 rounded border border-red-500/20">
						{errorMsg}
					</div>
				)}

				{/* Real-time Graph */}
				<div className="mt-2 border border-border rounded overflow-hidden bg-black/20 h-16 relative">
					<canvas
						ref={canvasRef}
						width={228}
						height={64}
						className="w-full h-full"
					/>
					<div className="absolute left-1 bottom-0.5 text-[8px] text-muted-foreground leading-none">
						1mm
					</div>
					<div className="absolute left-1 top-1 text-[8px] text-muted-foreground leading-none">
						9mm
					</div>
				</div>
			</div>

			<div
				ref={mountRef}
				className="w-full h-full cursor-grab active:cursor-grabbing"
			/>
		</div>
	);
}
