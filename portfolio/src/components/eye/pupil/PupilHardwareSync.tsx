import { ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createIrisScene, type IrisScene } from "./irisScene";

export default function PupilHardwareSync() {
	const mountRef = useRef<HTMLDivElement>(null);
	const sceneRef = useRef<IrisScene | null>(null);
	const [deviceIp, setDeviceIp] = useState("192.168.18.39");
	const [status, setStatus] = useState<
		"disconnected" | "connecting" | "streaming"
	>("disconnected");
	const [errorMsg, setErrorMsg] = useState("");
	const [pupilMm, setPupilMm] = useState<{ left: number; right: number }>({
		left: 0,
		right: 0,
	});
	const [isSettingsOpen, setIsSettingsOpen] = useState(true);

	const scriptRef = useRef<HTMLScriptElement | null>(null);
	const originalWsRef = useRef<any>(null);
	const dummyRootRef = useRef<HTMLDivElement | null>(null);

	// Graph state
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const historyRef = useRef<{ left: number; right: number }[]>([]);

	useEffect(() => {
		if (!mountRef.current) return;
		sceneRef.current = createIrisScene(mountRef.current, {
			pupilRadius: 3.0 * (0.5 / 12.0),
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
		// biome-ignore lint/correctness/useExhaustiveDependencies: mount only
	}, []);

	const updateGraph = (val: { left: number; right: number }) => {
		const history = historyRef.current;
		history.push(val);
		// 5 seconds at 200 Hz = 1000 points
		if (history.length > 1000) history.shift();

		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const w = canvas.width;
		const h = canvas.height;
		ctx.clearRect(0, 0, w, h);

		ctx.lineWidth = 2;

		// Draw Right Eye (Blue)
		ctx.beginPath();
		ctx.strokeStyle = "#3b82f6"; // blue-500
		for (let i = 0; i < history.length; i++) {
			const x = history.length > 1 ? (i / (history.length - 1)) * w : 0;
			const rawY = h - ((history[i].right - 1) / 8) * h;
			const y = Math.min(Math.max(rawY, 0), h);
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();

		// Draw Left Eye (Emerald)
		ctx.beginPath();
		ctx.strokeStyle = "#10b981"; // emerald-500
		for (let i = 0; i < history.length; i++) {
			const x = history.length > 1 ? (i / (history.length - 1)) * w : 0;
			const rawY = h - ((history[i].left - 1) / 8) * h;
			const y = Math.min(Math.max(rawY, 0), h);
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.stroke();
	};

	const cleanupSandbox = () => {
		if ((window as any)._neonGazeCallback) {
			delete (window as any)._neonGazeCallback;
		}
		if (scriptRef.current?.parentNode) {
			scriptRef.current.parentNode.removeChild(scriptRef.current);
			scriptRef.current = null;
		}
		if (dummyRootRef.current?.parentNode) {
			dummyRootRef.current.parentNode.removeChild(dummyRootRef.current);
			dummyRootRef.current = null;
		}
	};

	const toggleConnection = async () => {
		if (status === "streaming" || status === "connecting") {
			cleanupSandbox();
			setStatus("disconnected");
			return;
		}

		setStatus("connecting");
		setErrorMsg("");
		try {
			// Restrict the input to a simple local IPv4/hostname format before embedding it in the generated code
			const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^localhost$|^neon\.local$/i;
			if (!ipRegex.test(deviceIp.trim())) {
				throw new Error("Security: Please provide a valid local IP address or hostname.");
			}
			const safeIp = deviceIp.trim();

			// 1. Create a hidden dummy root for the Neon app to mount to
			const dummyRoot = document.createElement("div");
			dummyRoot.id = "neon-dummy-root";
			dummyRoot.style.display = "none";
			document.body.appendChild(dummyRoot);
			dummyRootRef.current = dummyRoot;

			// 2. Set up a global callback for the scoped WebSocket interceptor
			// Each eye arrives as a number or NaN (invalid / missing sample).
			let receivedFirstSample = false;
			(window as any)._neonGazeCallback = (pupil_left: number, pupil_right: number) => {
				if (!receivedFirstSample) {
					receivedFirstSample = true;
					setStatus("streaming");
				}
				const left = Number.isNaN(pupil_left) ? pupil_right : pupil_left;
				const right = Number.isNaN(pupil_right) ? pupil_left : pupil_right;
				if (sceneRef.current) {
					sceneRef.current.params.pupilRadius = ((left + right) / 2) * (0.5 / 12.0);
				}
				const newData = { left, right };
				setPupilMm(newData);
				updateGraph(newData);
			};

			// 3. Fetch the device's webapp dynamically
			const fetchOpts = {
				headers: { Connection: "close" },
				cache: "no-store" as RequestCache,
			};
			const htmlRes = await fetch(`http://${safeIp}:8080/`, fetchOpts);
			const html = await htmlRes.text();
			const scriptMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
			if (!scriptMatch)
				throw new Error("Could not find index.js in the Neon device response");

			// 4. Fetch the JS bundle and sandbox its mount point & location
			const jsRes = await fetch(
				`http://${safeIp}:8080${scriptMatch[1]}`,
				fetchOpts,
			);
			let scriptText = await jsRes.text();

			// Nuke its ability to take over our #root element
			scriptText = scriptText.replace(
				/getElementById\(['"]root['"]\)/g,
				"getElementById('neon-dummy-root')",
			);

			// Force the app to always subscribe to the gaze stream regardless of UI toggles/tabs
			localStorage.setItem("forceGazeSize", "10");
			scriptText = scriptText.replace(/gazeRadiusPercent/g, "forceGazeSize");
			scriptText = scriptText.replace(/!document\.hidden/g, "true");

			// Completely disable the heavy 1080p world video stream from rendering or wasting bandwidth
			scriptText = scriptText.replace(/WORLD="world"/g, 'WORLD="DISABLED"');

			// Force it to connect to the device IP instead of the blog's localhost
			scriptText = scriptText.replace(
				/window\.location\.href/g,
				`("http://${safeIp}:8080/")`,
			);
			scriptText = scriptText.replace(
				/window\.location\.hostname/g,
				`("${safeIp}")`,
			);
			scriptText = scriptText.replace(
				/window\.location\.host/g,
				`("${safeIp}:8080")`,
			);

			// 5. Inject locally scoped WebSocket interceptor directly into the bundle
			scriptText = scriptText.replace(
				/new\s+(?:window\.)?WebSocket\b/g,
				`new (class extends WebSocket {
					constructor(url, protocols) {
						super(url, protocols);
						if (url.includes("${safeIp}") && !url.includes("status")) {
							let expectingRtpPacket = false;
							this.addEventListener("message", (event) => {
								if (typeof event.data === "string") return;
								const buffer = new Uint8Array(event.data);
								if (buffer[0] === 0x24 && buffer.length === 4) {
									expectingRtpPacket = true;
									return;
								}
								if (expectingRtpPacket) {
									expectingRtpPacket = false;
									// RTP header: 12 fixed bytes + 4 per CSRC (CC, low nibble of byte 0)
									// + optional header extension (X bit) of 4 + 4*length bytes.
									if (buffer.length < 12) return;
									const csrcCount = buffer[0] & 0x0f;
									const hasExtension = (buffer[0] & 0x10) !== 0;
									let payloadOffset = 12 + csrcCount * 4;
									if (hasExtension && buffer.length >= payloadOffset + 4) {
										const extWords = (buffer[payloadOffset + 2] << 8) | buffer[payloadOffset + 3];
										payloadOffset += 4 + extWords * 4;
									}
									const payloadSize = buffer.length - payloadOffset;
									// Eye-state gaze payload (65 bytes): pupil_diameter_left @ 9, pupil_diameter_right @ 37, big-endian float32
									if (payloadSize >= 65 && window._neonGazeCallback) {
										const dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
										const valid = (v) => Number.isFinite(v) && v > 0 && v < 15;
										const rawLeft = dataView.getFloat32(payloadOffset + 9, false);
										const rawRight = dataView.getFloat32(payloadOffset + 37, false);
										const pupil_left = valid(rawLeft) ? rawLeft : NaN;
										const pupil_right = valid(rawRight) ? rawRight : NaN;
										if (!Number.isNaN(pupil_left) || !Number.isNaN(pupil_right)) {
											window._neonGazeCallback(pupil_left, pupil_right);
										}
									}
								}
							});
						}
					}
				})`
			);

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
			setStatus("disconnected");
		}
	};

	return (
		<div className="relative w-full h-[500px] md:h-[580px] bg-transparent overflow-hidden rounded-lg group border border-border">
			{/* Collapsible Settings Overlay */}
			<div className="absolute top-4 left-4 p-3 rounded-xl bg-card/80 backdrop-blur-md border border-border flex flex-col z-10 w-64 shadow-xl pointer-events-auto transition-all">
				<div
					className="flex items-center justify-between cursor-pointer select-none"
					onClick={() => setIsSettingsOpen(!isSettingsOpen)}
				>
					<div className="flex items-center gap-2">
						<Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
						<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
							Live Neon pupil data
						</span>
					</div>
					<div className="flex items-center gap-2">
						<div
							className={`w-2 h-2 rounded-full ${status === "streaming" ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : status === "connecting" ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`}
						/>
						{isSettingsOpen ? (
							<ChevronUp className="w-3 h-3 text-muted-foreground" />
						) : (
							<ChevronDown className="w-3 h-3 text-muted-foreground" />
						)}
					</div>
				</div>

				{isSettingsOpen && (
					<div className="flex flex-col gap-2 mt-3">
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
							className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors w-full ${status === "streaming" ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
						>
							{status === "streaming"
								? "Disconnect"
								: status === "connecting"
									? "Connecting..."
									: "Connect"}
						</button>
						{errorMsg && (
							<div className="text-xs text-red-500 font-semibold bg-red-500/10 p-2 rounded border border-red-500/20">
								{errorMsg}
							</div>
						)}
					</div>
				)}
			</div>

			<div
				ref={mountRef}
				className="w-full h-full cursor-grab active:cursor-grabbing"
			/>

			{/* Main View Real-time Graph (Bottom) */}
			<div className="absolute bottom-0 left-0 w-full h-28 bg-gradient-to-t from-background/90 to-transparent pointer-events-none flex items-end">
				<canvas
					ref={canvasRef}
					width={1000}
					height={112}
					className="absolute bottom-0 left-0 w-full h-full opacity-70"
				/>
				<div className="absolute left-2 bottom-2 text-[10px] text-muted-foreground font-mono">
					1mm
				</div>
				<div className="absolute left-2 top-2 text-[10px] text-muted-foreground font-mono">
					9mm
				</div>
				<div className="absolute right-2 top-2 text-[10px] text-emerald-500/70 font-mono font-bold tracking-wider uppercase">
					LAST 5s
				</div>

				<div className="absolute right-4 bottom-2 flex gap-4">
					<div className="flex flex-col items-end">
						<span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">
							Left
						</span>
						<div className="flex items-baseline gap-1">
							<span className="text-3xl font-mono font-bold text-foreground leading-none drop-shadow-md">
								{pupilMm.left.toFixed(2)}
							</span>
							<span className="text-xs font-semibold text-muted-foreground">
								mm
							</span>
						</div>
					</div>
					<div className="flex flex-col items-end">
						<span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-0.5">
							Right
						</span>
						<div className="flex items-baseline gap-1">
							<span className="text-3xl font-mono font-bold text-foreground leading-none drop-shadow-md">
								{pupilMm.right.toFixed(2)}
							</span>
							<span className="text-xs font-semibold text-muted-foreground">
								mm
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
