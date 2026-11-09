import { describe, expect, it } from 'vitest';
import assetLinksText from '../../../public/.well-known/assetlinks.json?raw';
import appConfigText from '../../app.json?raw';
import { PRODUCTION_API_URL } from '~/constants/config';
import { parseEventUrl } from './deepLink';

// The three places must agree, or Android silently opens links in the browser instead of the app.
const assetLinks = JSON.parse(assetLinksText);
const { android, ios, scheme } = JSON.parse(appConfigText).expo;

describe('Android App Links', () => {
  it('declare the same package on the website and in the app', () => {
    expect(assetLinks).toHaveLength(1);
    expect(assetLinks[0].target.namespace).toBe('android_app');
    expect(assetLinks[0].target.package_name).toBe(android.package);
    expect(assetLinks[0].relation).toEqual(['delegate_permission/common.handle_all_urls']);
    expect(ios.bundleIdentifier).toBe(android.package);
  });

  it('are verified for event pages on the production host only', () => {
    expect(android.intentFilters).toHaveLength(1);
    const [filter] = android.intentFilters;
    expect(filter.autoVerify).toBe(true);
    expect(filter.action).toBe('VIEW');
    expect(filter.category).toEqual(['BROWSABLE', 'DEFAULT']);
    expect(filter.data).toEqual([{ scheme: 'https', host: new URL(PRODUCTION_API_URL).host, pathPrefix: '/e/' }]);
  });

  it('list only well-formed certificate fingerprints', () => {
    for (const fingerprint of assetLinks[0].target.sha256_cert_fingerprints) {
      expect(fingerprint).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
    }
  });
});

describe('the custom scheme', () => {
  it('is the one the link parser reads', () => {
    expect(parseEventUrl(`${scheme}://e/abc`)).toEqual({ slug: 'abc', adminKey: null });
  });
});
