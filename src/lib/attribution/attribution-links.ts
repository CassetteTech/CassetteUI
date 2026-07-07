import type { InternalSignupLinkTemplate } from '@/types';

export const DEFAULT_TEMPLATE_DESTINATION = '/signup';

// Sentinel destination: the template is used from the Share menu on post pages,
// where the concrete /post/{id} link and utm_content tag are filled in per post.
export const POST_SHARE_DESTINATION = '/post';

export const TEMPLATE_DESTINATION_PRESETS = [
  { value: '/signup', label: 'Signup' },
  { value: '/', label: 'Homepage' },
  { value: POST_SHARE_DESTINATION, label: 'Post share' },
] as const;

export function isPostShareTemplate(template: { destinationPath?: string | null }): boolean {
  return template.destinationPath === POST_SHARE_DESTINATION;
}

const DESTINATION_PATH_MAX_LENGTH = 200;

type TemplateAttributionValues = Pick<InternalSignupLinkTemplate, 'source' | 'medium' | 'campaign'> & {
  destinationPath?: string | null;
};

// Mirrors the Bridge-side TryNormalizeDestinationPath rules: a bare internal path with no
// query/fragment, so the template's utm params stay the only query string on the link.
export function isValidDestinationPath(path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed || trimmed.length > DESTINATION_PATH_MAX_LENGTH) return false;
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return false;
  return /^\/[A-Za-z0-9\-._~/]*$/.test(trimmed);
}

function normalizeValue(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function buildAttributionParams(template: TemplateAttributionValues): URLSearchParams {
  const params = new URLSearchParams();
  const source = normalizeValue(template.source);
  const medium = normalizeValue(template.medium);
  const campaign = normalizeValue(template.campaign);
  if (source) params.set('src', source);
  if (medium) params.set('utm_medium', medium);
  if (campaign) params.set('utm_campaign', campaign);
  return params;
}

export function buildTemplateRelativePath(template: TemplateAttributionValues): string {
  const destination = normalizeValue(template.destinationPath) ?? DEFAULT_TEMPLATE_DESTINATION;
  const search = buildAttributionParams(template).toString();
  return search ? `${destination}?${search}` : destination;
}

export function buildTemplateUrl(origin: string, template: TemplateAttributionValues): string {
  return `${origin.replace(/\/+$/, '')}${buildTemplateRelativePath(template)}`;
}

// Share link for a post: template supplies source/medium/campaign, the post supplies the
// destination and identifies itself via utm_content so signups can be traced back to it.
export function buildAttributedPostPath(postId: string, template: TemplateAttributionValues): string {
  const params = buildAttributionParams(template);
  params.set('utm_content', `post-${postId}`);
  return `/post/${postId}?${params.toString()}`;
}
