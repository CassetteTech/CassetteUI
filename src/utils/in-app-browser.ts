/**
 * Detects the embedded browsers of social apps. Google refuses OAuth in an
 * embedded web view (`disallowed_useragent`), so sign-in must move to the
 * device browser first.
 */

export type InAppBrowserApp =
  | 'Instagram'
  | 'TikTok'
  | 'Facebook'
  | 'Messenger'
  | 'Snapchat'
  | 'LinkedIn'
  | 'LINE';

export type InAppBrowser = {
  app: InAppBrowserApp;
  os: 'ios' | 'android' | 'other';
};

// Each app names itself in its user agent. The order matters: Instagram and
// Messenger user agents can also carry the Facebook markers. Only documented
// app markers count; a generic web-view shape check would also match real
// browsers and block their sign-in.
const APP_MARKERS: ReadonlyArray<[InAppBrowserApp, RegExp]> = [
  ['Instagram', /\bInstagram\b/],
  ['TikTok', /\bmusical_ly|\bBytedanceWebview\b|\bTikTok\b/i],
  ['Messenger', /\bMessengerForiOS\b|\bOrca-Android\b|FB_IAB\/MESSENGER/],
  ['Facebook', /\bFBAN\/|\bFBAV\/|\bFB_IAB\//],
  ['Snapchat', /\bSnapchat\b/],
  ['LinkedIn', /\bLinkedInApp\b/],
  ['LINE', /\bLine\/\d/],
];

export function detectInAppBrowser(userAgent: string | null | undefined): InAppBrowser | null {
  if (!userAgent) return null;
  const match = APP_MARKERS.find(([, marker]) => marker.test(userAgent));
  if (!match) return null;
  const os = /\b(iPhone|iPad|iPod)\b/.test(userAgent) ? 'ios' : /\bAndroid\b/.test(userAgent) ? 'android' : 'other';
  return { app: match[0], os };
}

/**
 * An Android intent URL that asks the system to open a web page in the
 * default browser. Only Android supports it. iOS has no documented scheme for
 * this, so iOS gets no link and the fan copies the link or uses the app menu.
 */
export function externalBrowserUrl(url: string, browser: InAppBrowser): string | null {
  if (browser.os !== 'android') return null;
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  const scheme = parsed.protocol.slice(0, -1);
  return `intent://${parsed.host}${parsed.pathname}${parsed.search}#Intent;scheme=${scheme};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`;
}

/** One line that tells the fan where the app keeps its open-in-browser option. */
export function inAppBrowserHint(browser: InAppBrowser): string {
  const menu = browser.os === 'android' ? '⋮' : '•••';
  return `In ${browser.app}, tap ${menu} at the top of the screen and choose to open the page in your browser.`;
}
