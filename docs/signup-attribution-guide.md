# Signup URL Attribution Guide

This document explains how Cassette signup links track campaign attribution, what each parameter means, and how marketing should use them.

## Entry URL

Use the public signup URL:

`https://www.cassette.tech/signup`

This URL forwards to the app's real signup page and preserves supported query parameters.

## Supported parameters

### `src`

Use `src` as the primary human-readable source label for where the signup came from.

Examples:

- `src=instagram`
- `src=tiktok`
- `src=newsletter`
- `src=artist-share`
- `src=friend-referral`

Best use:

- Channel-level source naming
- Custom source names that are easy for the team to read later

Notes:

- If `src` is present, it wins over `utm_source`.
- Keep values short and consistent.
- Use lowercase and hyphens instead of spaces.

### `utm_source`

Use `utm_source` when you want standard UTM-compatible source tracking.

Examples:

- `utm_source=instagram`
- `utm_source=substack`
- `utm_source=spotify`

Best use:

- Campaigns already managed with UTM conventions
- External tools that expect standard UTM fields

Notes:

- Cassette uses `src` first, then falls back to `utm_source`.
- Do not set conflicting `src` and `utm_source` values unless you intentionally want `src` to override.

### `utm_medium`

Use `utm_medium` for the traffic type or format.

Examples:

- `utm_medium=social`
- `utm_medium=paid-social`
- `utm_medium=email`
- `utm_medium=creator-partnership`
- `utm_medium=referral`

Best use:

- Distinguishing paid vs organic
- Separating email, social, partnerships, and referral traffic

### `utm_campaign`

Use `utm_campaign` for the named campaign, launch, promo, or experiment.

Examples:

- `utm_campaign=spring-drop-2026`
- `utm_campaign=playlist-launch`
- `utm_campaign=beta-waitlist-push`
- `utm_campaign=artist-invite-wave-1`

Best use:

- Reporting at the campaign level
- Grouping many links under one initiative

## What Cassette stores

When a visitor first lands on a Cassette page with supported signup parameters, Cassette captures:

- signup source
- signup medium
- signup campaign
- first referrer domain
- capture timestamp

The app stores this as first-touch attribution in a secure `HttpOnly` cookie for up to 30 days, then attaches it when the person signs up.

For Google signup, Cassette also persists the attribution through the OAuth redirect flow so the campaign data is not lost.

## Can parameters be stacked?

Yes. These parameters are designed to work together.

Recommended stack:

`/signup?src=instagram&utm_medium=paid-social&utm_campaign=spring-drop-2026`

This means:

- `src=instagram`: where the user came from
- `utm_medium=paid-social`: what kind of traffic it was
- `utm_campaign=spring-drop-2026`: which campaign it belonged to

Another good example:

`/signup?src=newsletter&utm_medium=email&utm_campaign=weekly-roundup`

## Precedence rules

Source precedence works like this:

1. `src`
2. `utm_source`

If both are present, Cassette stores `src` as the source.

Example:

`/signup?src=artist-share&utm_source=instagram&utm_medium=social&utm_campaign=summer-push`

Stored result:

- source: `artist-share`
- medium: `social`
- campaign: `summer-push`

## First-touch behavior

Cassette currently uses first-touch attribution for this signup flow.

That means:

- The first supported signup link a visitor lands on is the one Cassette keeps.
- Later campaign links do not overwrite the attribution if it is already captured.

Example:

1. A user first visits from `?src=tiktok&utm_medium=social&utm_campaign=summer-launch`
2. The same user later visits from `?src=newsletter&utm_medium=email&utm_campaign=final-push`
3. Cassette keeps the first set: `tiktok / social / summer-launch`

This is intentional. The current implementation is built to answer: "What first brought this person into the signup funnel?"

## Referrer handling

Cassette also stores the first referrer domain when available.

Example:

- If the visit came from Instagram's in-app browser, the stored referrer domain may look like `l.instagram.com`
- If the visit came from Substack, it may look like `substack.com`

Important:

- Cassette stores the domain only, not the full referring URL.
- This is useful for sanity-checking source traffic without storing full page paths.

## Example URLs for marketing

### Organic social post

`https://www.cassette.tech/signup?src=instagram&utm_medium=social&utm_campaign=summer-launch`

### Paid TikTok campaign

`https://www.cassette.tech/signup?src=tiktok&utm_medium=paid-social&utm_campaign=creator-acquisition`

### Newsletter CTA

`https://www.cassette.tech/signup?src=newsletter&utm_medium=email&utm_campaign=weekly-roundup`

### Artist partner share link

`https://www.cassette.tech/signup?src=artist-share&utm_medium=creator-partnership&utm_campaign=artist-wave-1`

### Referral link from community

`https://www.cassette.tech/signup?src=discord&utm_medium=community&utm_campaign=beta-invite`

## Recommendations for naming

To keep reporting clean:

- Use lowercase only
- Use hyphens, not spaces
- Keep `src` values stable over time
- Use `utm_medium` for traffic type, not source
- Use `utm_campaign` for the initiative name, not the channel

Good:

- `src=instagram`
- `utm_medium=paid-social`
- `utm_campaign=spring-drop-2026`

Avoid:

- `src=InstagramStoryAdApril`
- `utm_medium=instagram`
- `utm_campaign=PaidSocial`

## What this does not currently track

This flow does not currently store:

- `utm_term`
- `utm_content`
- last-touch attribution
- multi-touch attribution

If marketing wants those later, that would be a follow-up product/engineering change.

## Short version for the team

Use `/signup` links with:

- `src` for the source name
- `utm_medium` for the traffic type
- `utm_campaign` for the campaign name

Recommended pattern:

`/signup?src=<source>&utm_medium=<medium>&utm_campaign=<campaign>`

Example:

`/signup?src=instagram&utm_medium=paid-social&utm_campaign=spring-drop-2026`
