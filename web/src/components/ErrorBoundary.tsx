import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
    this.setState({ info });
  }

  reset = () => {
    this.setState({ error: null, info: null });
  };

  clearSession = async () => {
    try {
      if ('__TAURI_INTERNALS__' in window) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('save_session', { sessionJson: '{}' });
      } else {
        localStorage.removeItem('folio-session');
      }
      location.reload();
    } catch (e) {
      console.error('Failed to clear session', e);
      location.reload();
    }
  };

  render() {
    if (this.state.error) {
      return (
        <div style={{
          height: '100vh',
          padding: '24px',
          background: '#1a1a2e',
          color: '#e0e0e0',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '12px',
          overflow: 'auto',
        }}>
          <h1 style={{ color: '#ff6b6b', marginTop: 0 }}>Folio — Runtime Error</h1>
          <p style={{ fontSize: '13px' }}>
            The app encountered an error. Most commonly this is caused by a corrupt session file.
          </p>
          <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
            <button
              onClick={this.reset}
              style={{ padding: '6px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Retry
            </button>
            <button
              onClick={this.clearSession}
              style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Reset Session & Reload
            </button>
          </div>
          <pre style={{ background: '#0f0f1e', padding: '12px', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            <strong>{this.state.error.name}: {this.state.error.message}</strong>
            {'\n\n'}
            {this.state.error.stack}
            {this.state.info?.componentStack && (
              <>{'\n\nComponent stack:'}{this.state.info.componentStack}</>
            )}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
