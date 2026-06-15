import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Surface the error to the console so it shows up in Safari Web Inspector
    // when running under Capacitor on iOS.
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: "24px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "#1a1a1a",
            background: "#fff",
            minHeight: "100vh",
            overflow: "auto",
          }}
        >
          <h1 style={{ fontSize: 20, marginBottom: 12 }}>Something went wrong</h1>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontSize: 12,
              background: "#f5f5f5",
              padding: 12,
              borderRadius: 8,
            }}
          >
            {this.state.error.name}: {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
