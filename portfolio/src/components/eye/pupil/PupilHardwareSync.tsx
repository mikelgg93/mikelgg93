import { ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createIrisScene, type IrisScene } from "./irisScene";
import {
	createPupilReceiver,
	drawPupilGraph,
	type PupilSample,
	validPupil,
} from "./neonPupil";

export default function PupilHardwareSync() {
	const mountRef = useRef<HTMLDivElement>(null);
	const sceneRef = useRef<IrisScene | null>(null);
	const [deviceIp, setDeviceIp] = useState("192.168.18.39");
	const [status, setStatus] = useState<
		"disconnected" | "connecting" | "streaming" | "error"
	>("disconnected");
	const [errorMsg, setErrorMsg] = useState("");
	const [pupilMm, setPupilMm] = useState<PupilSample>({
		left: null,
		right: null,
	});
	const [isSettingsOpen, setIsSettingsOpen] = useState(true);

	// Disposal deliberately has no React state updates: safe on unmount/cancel.
	const disposeConnectionRef = useRef<(() => void) | null>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const historyRef = useRef<PupilSample[]>([]);

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
			disposeConnectionRef.current?.();
		};
	}, []);

	const toggleConnection = async () => {
		if (status === "streaming" || status === "connecting") {
			disposeConnectionRef.current?.();
			setStatus("disconnected");
			return;
		}

		disposeConnectionRef.current?.();
		setStatus("connecting");
		setErrorMsg("");
		setPupilMm({ left: null, right: null });
		historyRef.current = [];
		const canvas = canvasRef.current;
		const context = canvas?.getContext("2d");
		if (canvas && context)
			drawPupilGraph(context, [], canvas.width, canvas.height);

		const abort = new AbortController();
		const sockets = new Set<WebSocket>();
		let frame: HTMLIFrameElement | null = null;
		let disposed = false;
		let lastSampleAt = performance.now();
		let receivedFirstSample = false;
		let animationFrame: number | null = null;
		let latest: PupilSample | null = null;
		let restoreStorage: (() => void) | null = null;
		const watchdog = window.setInterval(() => {
			if (
				performance.now() - lastSampleAt >
				(receivedFirstSample ? 5000 : 15000)
			) {
				fail(
					receivedFirstSample
						? "Pupil stream stopped. Reconnect to try again."
						: "No pupil stream received. Check the device and enable Compute Eye State.",
				);
			}
		}, 1000);
		const dispose = () => {
			if (disposed) return;
			disposed = true;
			abort.abort();
			window.clearInterval(watchdog);
			if (animationFrame !== null) cancelAnimationFrame(animationFrame);
			for (const socket of sockets) socket.close();
			sockets.clear();
			frame?.remove(); // destroys the Monitor document's listeners and timers
			restoreStorage?.();
			if (disposeConnectionRef.current === dispose)
				disposeConnectionRef.current = null;
		};
		disposeConnectionRef.current = dispose;
		const fail = (message: string) => {
			if (disposed) return;
			dispose();
			setErrorMsg(message);
			setStatus("error");
		};
		try {
			const safeIp = deviceIp.trim().toLowerCase();
			const ipv4 =
				/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(safeIp) &&
				safeIp.split(".").every((part) => Number(part) <= 255);
			if (!ipv4 && safeIp !== "localhost" && safeIp !== "neon.local") {
				throw new Error(
					"Please provide a valid device IPv4 address, localhost or neon.local.",
				);
			}

			// Keep the Companion Monitor bundle and its WebSocket integration.
			// A hidden iframe gives its DOM, listeners and timers a disposable lifetime.
			// It is same-origin for callbacks, not a security boundary for the bundle.
			frame = document.createElement("iframe");
			frame.title = "Neon Companion Monitor";
			frame.style.display = "none";
			document.body.appendChild(frame);
			const frameDocument = frame.contentDocument!;
			const frameWindow = frame.contentWindow! as Window & {
				_neonObserve?: (socket: WebSocket, url: string) => void;
			};
			const base = frameDocument.createElement("base");
			base.href = `http://${safeIp}:8080/`;
			frameDocument.head.appendChild(base);
			const dummyRoot = frameDocument.createElement("div");
			dummyRoot.id = "neon-dummy-root";
			frameDocument.body.appendChild(dummyRoot);
			frameWindow.addEventListener("error", () =>
				fail(
					"Could not load the Companion Monitor. Check browser access to the device.",
				),
			);
			frameWindow.addEventListener("unhandledrejection", () =>
				fail(
					"Companion Monitor connection failed. Check browser access to the device.",
				),
			);

			const onSample = (sample: PupilSample) => {
				if (disposed) return;
				const left = validPupil(sample.left) ? sample.left : null;
				const right = validPupil(sample.right) ? sample.right : null;
				if (left === null && right === null) return;
				lastSampleAt = performance.now();
				if (!receivedFirstSample) {
					receivedFirstSample = true;
					setStatus("streaming");
				}
				latest = { left, right }; // preserve missing eyes as gaps, not invented measurements
				historyRef.current.push(latest);
				if (historyRef.current.length > 1000) historyRef.current.shift();
				// Measurements may arrive at 200 Hz; presentation follows browser frames.
				if (animationFrame === null)
					animationFrame = requestAnimationFrame(() => {
						animationFrame = null;
						if (disposed || !latest) return;
						const values = [latest.left, latest.right].filter(validPupil);
						const mean =
							values.reduce((sum, value) => sum + value, 0) / values.length;
						if (sceneRef.current)
							sceneRef.current.params.pupilRadius = mean * (0.5 / 12.0);
						setPupilMm(latest);
						const graph = canvasRef.current;
						const ctx = graph?.getContext("2d");
						if (graph && ctx)
							drawPupilGraph(
								ctx,
								historyRef.current,
								graph.width,
								graph.height,
							);
					});
			};
			frameWindow._neonObserve = (socket, url) => {
				sockets.add(socket);
				socket.addEventListener("close", () => sockets.delete(socket));
				const parsedUrl = new URL(url);
				if (
					parsedUrl.hostname !== safeIp ||
					parsedUrl.pathname.includes("status")
				)
					return;
				const receive = createPupilReceiver(onSample);
				// Preserve message order even if the Monitor uses Blob rather than ArrayBuffer.
				let pending = Promise.resolve();
				socket.addEventListener("message", (event) => {
					if (typeof event.data === "string") return;
					pending = pending
						.then(async () => {
							if (disposed) return;
							const data =
								typeof event.data?.arrayBuffer === "function"
									? await event.data.arrayBuffer()
									: event.data;
							if (!disposed) receive(new Uint8Array(data));
						})
						.catch(() => fail("Could not read the pupil stream."));
				});
				socket.addEventListener("error", () =>
					fail("Neon stream connection failed."),
				);
			};

			// 3. Fetch the device's webapp dynamically
			const fetchOpts = {
				signal: abort.signal,
				cache: "no-store" as RequestCache,
			};
			const htmlRes = await fetch(`http://${safeIp}:8080/`, fetchOpts);
			if (!htmlRes.ok)
				throw new Error(`Companion returned HTTP ${htmlRes.status}`);
			const html = await htmlRes.text();
			if (disposed) return;
			const scriptMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
			if (!scriptMatch)
				throw new Error("Could not find index.js in the Neon device response");

			// 4. Fetch the JS bundle and sandbox its mount point & location
			const jsRes = await fetch(
				`http://${safeIp}:8080${scriptMatch[1]}`,
				fetchOpts,
			);
			if (!jsRes.ok)
				throw new Error(`Monitor bundle returned HTTP ${jsRes.status}`);
			let scriptText = await jsRes.text();
			if (disposed) return;

			// Keep the Monitor mount point scoped to its hidden document
			scriptText = scriptText.replace(
				/getElementById\(['"]root['"]\)/g,
				"getElementById('neon-dummy-root')",
			);

			// Force the app to always subscribe to the gaze stream regardless of UI toggles/tabs
			const previousGazeSize = localStorage.getItem("forceGazeSize");
			restoreStorage = () => {
				if (previousGazeSize === null) localStorage.removeItem("forceGazeSize");
				else localStorage.setItem("forceGazeSize", previousGazeSize);
			};
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

			// 5. Scope the interceptor to sockets constructed by the Monitor bundle.
			scriptText = scriptText.replace(
				/new\s+(?:window\.)?WebSocket\b/g,
				`new (class extends WebSocket {
					constructor(url, protocols) {
						super(url, protocols);
						window._neonObserve(this, this.url);
					}
				})`,
			);
			const script = frameDocument.createElement("script");
			script.type = "module";
			script.textContent = scriptText;
			script.onerror = () =>
				fail("Could not load the Companion Monitor bundle.");
			frameDocument.body.appendChild(script);
		} catch (error: unknown) {
			fail(
				error instanceof Error ? error.message : "Could not connect to Neon.",
			);
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
							role="status"
							aria-label={status}
							title={status}
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
							disabled={status === "connecting" || status === "streaming"}
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
									? "Cancel connection"
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
					10mm
				</div>
				<div className="absolute right-2 top-2 text-[10px] text-emerald-500/70 font-mono font-bold tracking-wider uppercase">
					LAST 1000 SAMPLES
				</div>

				<div className="absolute right-4 bottom-2 flex gap-4">
					<div className="flex flex-col items-end">
						<span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">
							Left
						</span>
						<div className="flex items-baseline gap-1">
							<span className="text-3xl font-mono font-bold text-foreground leading-none drop-shadow-md">
								{pupilMm.left?.toFixed(2) ?? "—"}
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
								{pupilMm.right?.toFixed(2) ?? "—"}
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
