// Sentry adapter. Lazy-imported only when SENTRY_DSN is set so mock mode
// does not pull the SDK into the bundle.

type SentryClient = {
  captureException: (err: unknown, hint?: { extra?: Record<string, unknown> }) => void;
  captureMessage: (message: string, extra?: Record<string, unknown>) => void;
};

let cached: SentryClient | null | undefined;
let initPromise: Promise<SentryClient | null> | null = null;

async function loadSentry(): Promise<SentryClient | null> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return null;
  try {
    // Dynamic import keeps the dep optional. The package is only required
    // when SENTRY_DSN is set; CI without Sentry will not need to install it.
    // We avoid a static module identifier so TypeScript does not require the
    // declaration to be resolvable at typecheck time.
    const moduleName = "@sentry/nextjs";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await (Function("name", "return import(name)") as (name: string) => Promise<unknown>)(moduleName).catch(() => null);
    if (!mod) return null;
    if (typeof mod.init === "function") {
      try {
        mod.init({
          dsn,
          tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
          environment: process.env.NODE_ENV ?? "development"
        });
      } catch {
        // init may already have been called by Sentry's auto-instrumentation.
      }
    }
    return {
      captureException: (err, hint) => {
        try {
          mod.captureException(err, hint);
        } catch {
          // swallow
        }
      },
      captureMessage: (message, extra) => {
        try {
          mod.captureMessage(message, { extra });
        } catch {
          // swallow
        }
      }
    };
  } catch {
    return null;
  }
}

export async function getSentry(): Promise<SentryClient | null> {
  if (cached !== undefined) return cached;
  if (!initPromise) initPromise = loadSentry();
  cached = await initPromise;
  return cached;
}

export function resetSentryForTests(): void {
  cached = undefined;
  initPromise = null;
}

export function isSentryConfigured(): boolean {
  return Boolean(process.env.SENTRY_DSN);
}
