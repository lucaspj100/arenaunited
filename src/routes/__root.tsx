import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";

// Patch Node.prototype.removeChild / insertBefore to survive DOM mutations
// caused by browser auto-translate (Google Translate) and extensions like
// Grammarly. Without this, React throws NotFoundError mid-render and the
// whole app shows the error boundary. Runs once on the client only.
if (typeof window !== "undefined" && !(window as any).__lov_domPatched) {
  (window as any).__lov_domPatched = true;
  const origRemove = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      if (child.parentNode) {
        try {
          (child.parentNode as Node).removeChild(child);
        } catch {
          /* noop */
        }
      }
      return child;
    }
    return origRemove.call(this, child) as T;
  } as typeof Node.prototype.removeChild;

  const origInsert = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(this: Node, newNode: T, refNode: Node | null): T {
    if (refNode && refNode.parentNode !== this) {
      try {
        return origInsert.call(this, newNode, null) as T;
      } catch {
        return newNode;
      }
    }
    return origInsert.call(this, newNode, refNode) as T;
  } as typeof Node.prototype.insertBefore;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const isPreview =
    typeof window !== "undefined" &&
    /lovable(?:project)?\.app|localhost|127\.0\.0\.1/.test(window.location.hostname);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-lg text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        {isPreview && (
          <pre className="mt-4 max-h-60 overflow-auto rounded-md border border-destructive/40 bg-destructive/5 p-3 text-left text-xs text-destructive whitespace-pre-wrap break-words">
            {error?.message ?? String(error)}
            {error?.stack ? `\n\n${error.stack}` : ""}
          </pre>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lovable App" },
      { name: "description", content: "Sales Star Ranker helps manage and rank sales teams with customizable criteria." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Lovable App" },
      { property: "og:description", content: "Sales Star Ranker helps manage and rank sales teams with customizable criteria." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Lovable App" },
      { name: "twitter:description", content: "Sales Star Ranker helps manage and rank sales teams with customizable criteria." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c5e80e54-5ee7-4de7-80e3-3470507fddf4/id-preview-c161badc--00f4d564-c3f1-4087-baae-80a03cfe8d52.lovable.app-1779317096999.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c5e80e54-5ee7-4de7-80e3-3470507fddf4/id-preview-c161badc--00f4d564-c3f1-4087-baae-80a03cfe8d52.lovable.app-1779317096999.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInvalidator />
      <Outlet />
    </QueryClientProvider>
  );
}

function AuthInvalidator() {
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      queryClient.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);
  return null;
}
