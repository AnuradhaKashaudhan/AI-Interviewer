import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
    console.error("ErrorBoundary caught an error", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding: '20px', background: 'red', color: 'white', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999}}>
          <h2>Something went wrong rendering the page.</h2>
          <pre style={{whiteSpace: 'pre-wrap', marginBottom: '20px'}}>{this.state.error && this.state.error.toString()}</pre>
          <pre style={{whiteSpace: 'pre-wrap', fontSize: '12px'}}>{this.state.info && this.state.info.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
