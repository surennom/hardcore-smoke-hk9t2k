// src/components/ErrorBoundary.js
import React from "react";

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, err: null, info: null };

  static getDerivedStateFromError(err) {
    return { hasError: true };
  }

  componentDidCatch(err, info) {
    if (process.env.NODE_ENV !== "production") {
      console.error("ErrorBoundary caught:", err, info);
    }
    this.setState({ err, info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card error-box">
          <h3>문제가 발생했습니다.</h3>

          <pre className="error-pre">{String(this.state.err)}</pre>

          {this.state.info?.componentStack && (
            <details className="error-details">
              <summary>컴포넌트 스택</summary>
              <pre className="error-pre">{this.state.info.componentStack}</pre>
            </details>
          )}

          <p className="error-note muted">
            (디버그용. 원인 찾으면 원래 버전으로 되돌려 주세요)
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
