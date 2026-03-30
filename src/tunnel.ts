/**
 * Tunneling module.
 *
 * Starts an ngrok or zrok tunnel based on environment variables and returns the public URL.
 * If no tunnel env vars are set, returns null and the process runs in stdio mode.
 *
 * Priority: NGROK_AUTHTOKEN > ZROK_TOKEN
 *
 * Both packages are optionalDependencies; you do not need them for stdio-only usage.
 *
 * ngrok: npm install @ngrok/ngrok
 * zrok:  npm install @openziti/zrok
 */

export type TunnelProvider = 'ngrok' | 'zrok';

export interface TunnelResult {
  provider: TunnelProvider;
  /** Public HTTPS URL (no trailing slash) */
  publicUrl: string;
  close: () => Promise<void>;
}

/** Detects which tunnel provider to use from environment variables. */
function detectProvider(): TunnelProvider | null {
  if (process.env.NGROK_AUTHTOKEN?.trim()) return 'ngrok';
  if (process.env.ZROK_TOKEN?.trim()) return 'zrok';
  return null;
}

async function startNgrokTunnel(port: number): Promise<TunnelResult> {
  let ngrok: typeof import('@ngrok/ngrok');
  try {
    ngrok = await import('@ngrok/ngrok');
  } catch {
    throw new Error(
      'NGROK_AUTHTOKEN is set but @ngrok/ngrok could not be loaded.\n' +
        'Install it with: npm install @ngrok/ngrok',
    );
  }

  const listener = await ngrok.forward({
    addr: port,
    authtoken: process.env.NGROK_AUTHTOKEN!.trim(),
  });

  const publicUrl = listener.url();
  if (!publicUrl) throw new Error('Could not get ngrok tunnel URL.');

  return {
    provider: 'ngrok',
    publicUrl: publicUrl.replace(/\/$/, ''),
    close: () => listener.close(),
  };
}

async function startZrokTunnel(port: number): Promise<TunnelResult> {
  // optionalDependency — use a variable to prevent TypeScript from resolving at compile time
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let zrok: any;
  try {
    const pkg = '@openziti/zrok';
    zrok = await import(/* @vite-ignore */ pkg);
  } catch {
    throw new Error(
      'ZROK_TOKEN is set but @openziti/zrok could not be loaded.\n' +
        'Install it with: npm install @openziti/zrok',
    );
  }

  // Initialize zrok environment (enable with ZROK_TOKEN)
  const root = zrok.loadRoot();
  await zrok.enable(root, process.env.ZROK_TOKEN!.trim());

  // Create public proxy share
  const shr = await zrok.share(root, {
    ShareMode: zrok.ShareMode.Public,
    BackendMode: zrok.BackendMode.Proxy,
    Target: `localhost:${port}`,
    Frontends: ['public'],
  });

  const publicUrl = shr.FrontendEndpoints?.[0];
  if (!publicUrl) throw new Error('Could not get zrok tunnel URL.');

  return {
    provider: 'zrok',
    publicUrl: publicUrl.replace(/\/$/, ''),
    close: async () => {
      await zrok.deleteShare(root, shr);
    },
  };
}

/**
 * Starts a tunnel if env vars are set.
 * - Returns null for stdio mode when no tunnel env vars are set
 * - Throws if env vars are set but the optional package is missing
 */
export async function startTunnel(port: number): Promise<TunnelResult | null> {
  const provider = detectProvider();
  if (!provider) return null;

  if (provider === 'zrok') return startZrokTunnel(port);
  if (provider === 'ngrok') return startNgrokTunnel(port);

  return null;
}
