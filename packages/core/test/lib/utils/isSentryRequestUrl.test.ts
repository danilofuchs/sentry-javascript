import type { Hub } from '@sentry/types';

import { isSentryRequestUrl } from '../../../src';

describe('isSentryRequestUrl', () => {
  it.each([
    ['', 'sentry-dsn.com', '', false],
    ['http://sentry-dsn.com/my-url', 'sentry-dsn.com', '', true],
    ['http://sentry-dsn.com', 'sentry-dsn.com', '', true],
    ['http://tunnel:4200', 'sentry-dsn.com', 'http://tunnel:4200', true],
    ['http://tunnel:4200', 'sentry-dsn.com', 'http://tunnel:4200/', true],
    ['http://tunnel:4200/', 'sentry-dsn.com', 'http://tunnel:4200', true],
    ['http://tunnel:4200/a', 'sentry-dsn.com', 'http://tunnel:4200', false],
  ])('works with url=%s, dsn=%s, tunnel=%s', (url: string, dsn: string, tunnel: string, expected: boolean) => {
    const hub = {
      getClient: () => {
        return {
          getOptions: () => ({ tunnel }),
          getDsn: () => ({ host: dsn }),
        };
      },
    } as unknown as Hub;

    expect(isSentryRequestUrl(url, hub)).toBe(expected);
  });
});
