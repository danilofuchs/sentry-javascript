import { vi } from 'vitest';

import { sentryAstro } from '../../src/integration';

const sentryVitePluginSpy = vi.fn(() => 'sentryVitePlugin');

vi.mock('@sentry/vite-plugin', () => ({
  // @ts-expect-error - just mocking around
  sentryVitePlugin: vi.fn(args => sentryVitePluginSpy(args)),
}));

process.env = {
  ...process.env,
  SENTRY_AUTH_TOKEN: 'my-token',
};

const updateConfig = vi.fn();
const injectScript = vi.fn();
const config = {
  root: new URL('file://path/to/project'),
  outDir: new URL('file://path/to/project/out'),
};

describe('sentryAstro integration', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has a name', () => {
    const integration = sentryAstro({});
    expect(integration.name).toBe('@sentry/astro');
  });

  it('enables source maps and adds the sentry vite plugin if an auth token is detected', async () => {
    const integration = sentryAstro({
      sourceMapsUploadOptions: { enabled: true, org: 'my-org', project: 'my-project', telemetry: false },
    });

    expect(integration.hooks['astro:config:setup']).toBeDefined();
    // @ts-expect-error - the hook exists and we only need to pass what we actually use
    await integration.hooks['astro:config:setup']({ updateConfig, injectScript, config });

    expect(updateConfig).toHaveBeenCalledTimes(1);
    expect(updateConfig).toHaveBeenCalledWith({
      vite: {
        build: {
          sourcemap: true,
        },
        plugins: ['sentryVitePlugin'],
      },
    });

    expect(sentryVitePluginSpy).toHaveBeenCalledTimes(1);
    expect(sentryVitePluginSpy).toHaveBeenCalledWith({
      authToken: 'my-token',
      org: 'my-org',
      project: 'my-project',
      telemetry: false,
      debug: false,
      sourcemaps: {
        assets: ['out/**/*'],
      },
    });
  });

  it('falls back to default output dir, if out and root dir are not available', async () => {
    const integration = sentryAstro({
      sourceMapsUploadOptions: { enabled: true, org: 'my-org', project: 'my-project', telemetry: false },
    });
    // @ts-expect-error - the hook exists and we only need to pass what we actually use
    await integration.hooks['astro:config:setup']({ updateConfig, injectScript, config: {} });

    expect(sentryVitePluginSpy).toHaveBeenCalledTimes(1);
    expect(sentryVitePluginSpy).toHaveBeenCalledWith({
      authToken: 'my-token',
      org: 'my-org',
      project: 'my-project',
      telemetry: false,
      debug: false,
      sourcemaps: {
        assets: ['dist/**/*'],
      },
    });
  });

  it("doesn't enable source maps if `sourceMapsUploadOptions.enabled` is `false`", async () => {
    const integration = sentryAstro({
      sourceMapsUploadOptions: { enabled: false },
    });

    expect(integration.hooks['astro:config:setup']).toBeDefined();
    // @ts-expect-error - the hook exists and we only need to pass what we actually use
    await integration.hooks['astro:config:setup']({ updateConfig, injectScript, config });

    expect(updateConfig).toHaveBeenCalledTimes(0);
    expect(sentryVitePluginSpy).toHaveBeenCalledTimes(0);
  });

  it('injects client and server init scripts', async () => {
    const integration = sentryAstro({});

    expect(integration.hooks['astro:config:setup']).toBeDefined();
    // @ts-expect-error - the hook exists and we only need to pass what we actually use
    await integration.hooks['astro:config:setup']({ updateConfig, injectScript, config });

    expect(injectScript).toHaveBeenCalledTimes(2);
    expect(injectScript).toHaveBeenCalledWith('page', expect.stringContaining('Sentry.init'));
    expect(injectScript).toHaveBeenCalledWith('page-ssr', expect.stringContaining('Sentry.init'));
  });

  it('injects client and server init scripts from custom paths', async () => {
    const integration = sentryAstro({
      clientInitPath: 'my-client-init-path.js',
      serverInitPath: 'my-server-init-path.js',
    });

    expect(integration.hooks['astro:config:setup']).toBeDefined();
    // @ts-expect-error - the hook exists and we only need to pass what we actually use
    await integration.hooks['astro:config:setup']({ updateConfig, injectScript, config });

    expect(injectScript).toHaveBeenCalledTimes(2);
    expect(injectScript).toHaveBeenCalledWith('page', expect.stringContaining('my-client-init-path.js'));
    expect(injectScript).toHaveBeenCalledWith('page-ssr', expect.stringContaining('my-server-init-path.js'));
  });
});
