import React, { useEffect, useRef, useState } from "react";
import { createIrisScene, type IrisScene } from "./irisScene";

export default function PupilHardwareSync() {
	const mountRef = useRef<HTMLDivElement>(null);
	const sceneRef = useRef<IrisScene | null>(null);
	const [wsUrl, setWsUrl] = useState("ws://neon.local:8686/?camera=gaze");
	const [status, setStatus] = useState<
		"disconnected" | "connecting" | "connected"
	>("disconnected");
	const [pupilMm, setPupilMm] = useState<number>(3.0);
	const wsRef = useRef<WebSocket | null>(null);

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
			if (wsRef.current) {
				wsRef.current.close();
			}
		};
	}, []);

	const toggleConnection = () => {
		if (status === "connected" || status === "connecting") {
			if (wsRef.current) wsRef.current.close();
			setStatus("disconnected");
			return;
		}

		setStatus("connecting");
		try {
			const ws = new WebSocket(wsUrl);
			ws.binaryType = "arraybuffer";
			let cseq = 1;
			let sessionId = "";

			ws.onopen = () => {
				// 1. Send RTSP OPTIONS
				ws.send(
					`OPTIONS ${wsUrl.replace("ws://", "rtsp://")} RTSP/1.0\r\nCSeq: ${cseq++}\r\n\r\n`,
				);
			};

			ws.onclose = () => setStatus("disconnected");
			ws.onerror = () => setStatus("disconnected");

			ws.onmessage = (event) => {
				if (typeof event.data === "string") {
					// Handle RTSP text responses
					const response = event.data;

					// Parse Session ID if present
					const sessionMatch = response.match(/Session:\s*([^\r\n;]+)/i);
					if (sessionMatch) sessionId = sessionMatch[1];

					if (response.includes("CSeq: 1")) {
						// 2. Send DESCRIBE
						ws.send(
							`DESCRIBE ${wsUrl.replace("ws://", "rtsp://")} RTSP/1.0\r\nCSeq: ${cseq++}\r\nAccept: application/sdp\r\n\r\n`,
						);
					} else if (response.includes("CSeq: 2")) {
						// 3. Send SETUP (Request TCP interleaved on channel 0-1)
						ws.send(
							`SETUP ${wsUrl.replace("ws://", "rtsp://")} RTSP/1.0\r\nCSeq: ${cseq++}\r\nTransport: RTP/AVP/TCP;unicast;interleaved=0-1\r\n\r\n`,
						);
					} else if (response.includes("CSeq: 3")) {
						// 4. Send PLAY
						setStatus("connected");
						ws.send(
							`PLAY ${wsUrl.replace("ws://", "rtsp://")} RTSP/1.0\r\nCSeq: ${cseq++}\r\nSession: ${sessionId}\r\n\r\n`,
						);
					}
					return;
				}

				// Handle binary interleaved RTP packets
				const buffer = new Uint8Array(event.data);
				if (buffer[0] === 0x24) {
					// '$' signifies interleaved binary data
					// buffer[1] is channel, buffer[2..3] is length
					const rtpHeaderSize = 12; // Standard RTP header length
					const payloadOffset = 4 + rtpHeaderSize; // Skip RTSP interleave header + RTP header

					if (buffer.length <= payloadOffset) return;

					// We do a minimalist MsgPack pattern match to avoid 3rd party deps!
					// "pupil_diameter_mm" is 17 chars. MsgPack fixstr for 17 is 0xB1.
					// We search the payload for this exact byte sequence.
					const targetKey = "pupil_diameter_mm";
					let foundIndex = -1;

					// Naive search
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
						// Next byte is the MsgPack float type (0xca for Float32, 0xcb for Float64)
						const typeByte = buffer[foundIndex];
						let diameter = 0;

						const dataView = new DataView(buffer.buffer);
						if (typeByte === 0xca) {
							diameter = dataView.getFloat32(foundIndex + 1, false); // big-endian
						} else if (typeByte === 0xcb) {
							diameter = dataView.getFloat64(foundIndex + 1, false); // big-endian
						}

						if (diameter > 0 && diameter < 10) {
							sceneRef.current.params.pupilRadius = diameter / 24;
							setPupilMm(diameter);
						}
					}
				}
			};
			wsRef.current = ws;
		} catch (e) {
			setStatus("disconnected");
		}
	};

	return (
		<div className="relative w-full h-[500px] md:h-[580px] bg-transparent overflow-hidden rounded-lg group border border-border">
			{/* Overlay */}
			<div className="absolute top-4 left-4 p-3 rounded-xl bg-card/80 backdrop-blur-md border border-border flex flex-col gap-2 z-10 w-64 shadow-xl pointer-events-auto">
				<div className="flex items-center justify-between">
					<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
						Zero-Dep Hardware Sync
					</span>
					<div
						className={`w-2.5 h-2.5 rounded-full ${status === "connected" ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : status === "connecting" ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`}
					/>
				</div>
				<input
					type="text"
					value={wsUrl}
					onChange={(e) => setWsUrl(e.target.value)}
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
							? "Connecting RTSP..."
							: "Connect (Browser Native)"}
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
			</div>

			<div
				ref={mountRef}
				className="w-full h-full cursor-grab active:cursor-grabbing"
			/>
		</div>
	);
}
