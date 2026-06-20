import React from 'react';

/**
 * ErrorBoundary — catches render/runtime crashes so the app shows a readable
 * error (with the message + component stack) instead of a blank white page.
 * The detail is what we need to fix a crash quickly.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
    // Surface it to the console for copy/paste as well.
    // eslint-disable-next-line no-console
    console.error('App crash caught by ErrorBoundary:', error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    const msg = String(this.state.error && (this.state.error.stack || this.state.error.message || this.state.error));
    const stack = this.state.info && this.state.info.componentStack;
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: '#0b0c0e', background: '#fbfbfc', minHeight: '100vh', padding: '48px 24px', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', background: '#fff', border: '1px solid #ebecf0', borderRadius: 12, boxShadow: '0 1px 2px rgba(11,12,14,0.05), 0 10px 28px -16px rgba(11,12,14,0.20)', padding: '24px 26px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#cf222e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Something went wrong</div>
          <h1 style={{ margin: '6px 0 10px', fontSize: 20, fontWeight: 650, letterSpacing: '-0.02em' }}>This screen hit an error</h1>
          <p style={{ margin: '0 0 16px', fontSize: 13.5, color: '#5c6066', lineHeight: 1.6 }}>
            The rest of the app is fine. Copy the detail below and send it over — it pinpoints the fix. You can also reload to get back to a working screen.
          </p>
          <button onClick={() => { try { window.location.reload(); } catch (e) { /* noop */ } }}
            style={{ background: '#5e6ad2', color: '#fff', border: '1px solid #5e6ad2', borderRadius: 7, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}>
            ↻ Reload
          </button>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11.5, lineHeight: 1.5, color: '#0b0c0e', background: '#f6f7f9', border: '1px solid #ebecf0', borderRadius: 8, padding: '12px 14px', margin: 0, fontFamily: "'JetBrains Mono', ui-monospace, monospace", maxHeight: 360, overflow: 'auto' }}>
{msg}{stack ? '\n\nComponent stack:' + stack : ''}
          </pre>
        </div>
      </div>
    );
  }
}
