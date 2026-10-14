import { useEffect, useRef } from "react";
import { createDemoLoop } from "./eye/demoLoop";

interface WebGLShaderProps {
	fragmentShaderSource: string;
	className?: string;
	width?: number | string;
	height?: number | string;
}

const vertexShaderSource = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

export default function WebGLShader({
	fragmentShaderSource,
	className = "",
	width = "100%",
	height = "400px",
}: WebGLShaderProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const gl = (canvas.getContext("webgl") ||
			canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
		if (!gl) {
			console.error("WebGL not supported");
			return;
		}

		// Compile Shader
		const compileShader = (type: number, source: string) => {
			const shader = gl.createShader(type);
			if (!shader) return null;
			gl.shaderSource(shader, source);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				console.error("Shader compile error:", gl.getShaderInfoLog(shader));
				gl.deleteShader(shader);
				return null;
			}
			return shader;
		};

		const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
		const fragmentShader = compileShader(
			gl.FRAGMENT_SHADER,
			fragmentShaderSource,
		);

		if (!vertexShader || !fragmentShader) {
			gl.deleteShader(vertexShader);
			gl.deleteShader(fragmentShader);
			return;
		}

		// Create Program
		const program = gl.createProgram();
		if (!program) {
			gl.deleteShader(vertexShader);
			gl.deleteShader(fragmentShader);
			return;
		}

		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			console.error("Program link error:", gl.getProgramInfoLog(program));
			gl.deleteProgram(program);
			gl.deleteShader(vertexShader);
			gl.deleteShader(fragmentShader);
			return;
		}

		gl.useProgram(program);

		const vertices = new Float32Array([
			-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0,
		]);

		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

		const positionLocation = gl.getAttribLocation(program, "position");
		gl.enableVertexAttribArray(positionLocation);
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

		const timeLocation = gl.getUniformLocation(program, "u_time");
		const resolutionLocation = gl.getUniformLocation(program, "u_resolution");

		const resize = () => {
			const displayWidth = canvas.clientWidth;
			const displayHeight = canvas.clientHeight;

			if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
				canvas.width = displayWidth;
				canvas.height = displayHeight;
				gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
			}
		};

		const loop = createDemoLoop(canvas, {
			continuous: (reducedMotion) => !reducedMotion,
			inspect: () => ({ model: "Illustrative fragment shader" }),
			draw: (_dt, elapsed) => {
				resize();

				gl.uniform1f(timeLocation, elapsed);
				gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);

				gl.clearColor(0.0, 0.0, 0.0, 0.0);
				gl.clear(gl.COLOR_BUFFER_BIT);

				gl.drawArrays(gl.TRIANGLES, 0, 6);

				return false;
			},
		});

		return () => {
			loop.dispose();
			gl.deleteProgram(program);
			gl.deleteShader(vertexShader);
			gl.deleteShader(fragmentShader);
			gl.deleteBuffer(buffer);
		};
	}, [fragmentShaderSource]);

	return (
		<canvas
			ref={canvasRef}
			className={`rounded-xl shadow-sm border border-border/50 ${className}`}
			style={{ width, height, display: "block" }}
		/>
	);
}
