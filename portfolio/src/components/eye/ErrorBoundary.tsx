import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: unknown): State {
		return {
			hasError: true,
			error: error instanceof Error ? error : new Error(String(error)),
		};
	}

	override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("ErrorBoundary caught an error", error, errorInfo);
	}

	override render() {
		if (this.state.hasError) {
			return (
				<div
					role="alert"
					style={{
						color: "red",
						padding: "20px",
						background: "black",
						width: "100%",
						height: "100%",
					}}
				>
					Error: {this.state.error?.message}
				</div>
			);
		}
		return this.props.children;
	}
}
