import test from 'node:test';
import assert from 'node:assert/strict';

import { detectInAppBrowser, externalBrowserUrl, inAppBrowserHint } from '../in-app-browser';

const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const ANDROID_WEBVIEW = 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240805.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/127.0.6533.103 Mobile Safari/537.36';

const IN_APP_USER_AGENTS = [
  ['Instagram', 'ios', `${IOS} Instagram 337.0.3.23.54 (iPhone15,3; iOS 17_5; en_US; en; scale=3.00; 1290x2796; 615089063; IABMV/1)`],
  ['Instagram', 'android', `${ANDROID_WEBVIEW} Instagram 343.0.0.33.101 Android (34/14; 420dpi; 1080x2205; Google/google; Pixel 8; shiba; shiba; en_US; 628436917)`],
  ['TikTok', 'ios', `${IOS} musical_ly_35.5.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/en Region/US WKWebView/1 BytedanceWebview/d8a21c6`],
  ['TikTok', 'android', `${ANDROID_WEBVIEW} trill_350504 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/35.5.4 BytedanceWebview/d8a21c6`],
  ['TikTok', 'ios', `${IOS} TikTok 35.5.0`],
  ['Facebook', 'ios', `${IOS} [FBAN/FBIOS;FBAV/473.0.0.35.109;FBDV/iPhone15,3;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBLC/en_US]`],
  ['Facebook', 'android', `${ANDROID_WEBVIEW} [FB_IAB/FB4A;FBAV/473.0.0.40.109;]`],
  ['Messenger', 'ios', `${IOS} [FBAN/MessengerForiOS;FBAV/470.0.0.40.110;FBDV/iPhone15,3]`],
  ['Messenger', 'android', `${ANDROID_WEBVIEW} [FB_IAB/Orca-Android;FBAV/470.0.0.17.109;]`],
  ['Snapchat', 'ios', `${IOS} Snapchat/13.0.0.0 (like Safari/8618.2.12.10.4, panda)`],
  ['LinkedIn', 'ios', `${IOS} [LinkedInApp]/9.30.1234`],
  ['LINE', 'ios', `${IOS} Safari Line/14.10.0`],
] as const;

void test('detects each supported in-app browser and its operating system', () => {
  for (const [app, os, userAgent] of IN_APP_USER_AGENTS) {
    assert.deepEqual(detectInAppBrowser(userAgent), { app, os }, userAgent);
  }
});

void test('leaves device browsers, other apps, and empty user agents alone', () => {
  for (const userAgent of [
    `${IOS.replace('Mobile/15E148', 'Version/17.5 Mobile/15E148')} Safari/604.1`,
    `${IOS} CriOS/127.0.6533.107 Safari/604.1`,
    `${IOS} FxiOS/129.0 Safari/605.1.15`,
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    ANDROID_WEBVIEW,
    'Pipeline/1.0',
    '',
    null,
    undefined,
  ]) {
    assert.equal(detectInAppBrowser(userAgent), null, String(userAgent));
  }
});

void test('builds an Android intent link to the default browser and no link on iOS', () => {
  const url = 'https://cassette.tech/profile/crate_keeper?intent=join&interval=year';
  assert.equal(
    externalBrowserUrl(url, { app: 'Instagram', os: 'android' }),
    'intent://cassette.tech/profile/crate_keeper?intent=join&interval=year#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end',
  );
  assert.equal(externalBrowserUrl(url, { app: 'Instagram', os: 'ios' }), null);
  assert.equal(externalBrowserUrl(url, { app: 'TikTok', os: 'other' }), null);
  assert.equal(
    externalBrowserUrl('http://local.cassette.tech:3000/profile/a?intent=follow', { app: 'TikTok', os: 'android' }),
    'intent://local.cassette.tech:3000/profile/a?intent=follow#Intent;scheme=http;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end',
  );
  assert.equal(externalBrowserUrl('javascript:alert(1)', { app: 'TikTok', os: 'android' }), null);
});

void test('names the app and its menu in the hint', () => {
  assert.match(inAppBrowserHint({ app: 'TikTok', os: 'ios' }), /^In TikTok, tap ••• /);
  assert.match(inAppBrowserHint({ app: 'Instagram', os: 'android' }), /^In Instagram, tap ⋮ /);
});
