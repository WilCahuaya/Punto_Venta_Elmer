import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack)
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface p-8 text-center">
        <h1 className="text-lg font-semibold text-[rgb(var(--text))]">Error en la pantalla</h1>
        <p className="max-w-lg text-sm text-[rgb(var(--text-muted))]">{this.state.error.message}</p>
        <button
          type="button"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
          onClick={() => this.setState({ error: null })}
        >
          Reintentar
        </button>
      </div>
    )
  }
}
