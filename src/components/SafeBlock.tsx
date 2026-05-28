import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode; name?: string };
type State = { error: Error | null };

/**
 * Isola um bloco da UI: se ele quebrar, não derruba o resto da tela.
 * Em preview/dev mostra a mensagem real do erro; em produção fica discreto.
 */
export class SafeBlock extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error(`[SafeBlock${this.props.name ? `:${this.props.name}` : ""}]`, error);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      const isPreview =
        typeof window !== "undefined" &&
        /lovable(?:project)?\.app|localhost|127\.0\.0\.1/.test(window.location.hostname);
      if (isPreview) {
        return (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive font-mono">
            <div className="font-bold mb-1">
              Bloco {this.props.name ?? "desconhecido"} falhou
            </div>
            <div className="opacity-80 break-words">{this.state.error.message}</div>
          </div>
        );
      }
      return null;
    }
    return this.props.children;
  }
}