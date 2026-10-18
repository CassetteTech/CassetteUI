import test from 'node:test';
import assert from 'node:assert/strict';

import { browserHandoffPath, parseProfileActionIntent } from '../profile-action-intent';

const parse = (query: string) => parseProfileActionIntent(new URLSearchParams(query));

void test('accepts only the allowed Follow and Join intents', () => {
  assert.deepEqual(parse('intent=follow'), { action: 'follow' });
  assert.deepEqual(parse('tab=liked&intent=follow'), { action: 'follow' });
  assert.deepEqual(parse('intent=join&interval=month'), { action: 'join', interval: 'month' });
  assert.deepEqual(parse('intent=join&interval=year'), { action: 'join', interval: 'year' });

  for (const query of [
    '',
    'intent=',
    'intent=FOLLOW',
    'intent=unfollow',
    'intent=follow&intent=join&interval=month',
    'intent=join',
    'intent=join&interval=week',
    'intent=join&interval=month&interval=year',
    'intent=checkout&interval=month',
    'follow=1',
    'membership=join&interval=month',
  ]) {
    assert.equal(parse(query), null, query);
  }
});

void test('turns a Follow or Join sign-in return into the profile with its intent', () => {
  assert.equal(browserHandoffPath('/profile/crate_keeper?follow=1'), '/profile/crate_keeper?intent=follow');
  assert.equal(
    browserHandoffPath('/profile/crate_keeper?type=playlists&follow=1'),
    '/profile/crate_keeper?type=playlists&intent=follow',
  );
  assert.equal(
    browserHandoffPath('/profile/crate_keeper?membership=join&interval=year'),
    '/profile/crate_keeper?intent=join&interval=year',
  );
  // The post a Join came from travels with the intent.
  assert.equal(
    browserHandoffPath('/profile/crate_keeper?membership=join&interval=month&source_post=p_20261001120000_abcdefghij0123'),
    '/profile/crate_keeper?source_post=p_20261001120000_abcdefghij0123&intent=join&interval=month',
  );
});

void test('opens sign-in with the same return for any other local page', () => {
  assert.equal(browserHandoffPath('/post/post-1'), '/auth/signin?redirect=%2Fpost%2Fpost-1');
  assert.equal(browserHandoffPath('/profile/crate_keeper'), '/auth/signin?redirect=%2Fprofile%2Fcrate_keeper');
  assert.equal(
    browserHandoffPath('/profile/crate_keeper?membership=join&interval=week'),
    '/auth/signin?redirect=%2Fprofile%2Fcrate_keeper%3Fmembership%3Djoin%26interval%3Dweek',
  );
  assert.equal(browserHandoffPath('/profile/a/b?follow=1'), '/auth/signin?redirect=%2Fprofile%2Fa%2Fb%3Ffollow%3D1');
});

void test('never hands off to an external, unsafe, or auth-flow destination', () => {
  for (const returnPath of [
    null,
    undefined,
    '',
    '/',
    'https://evil.example/profile/a?follow=1',
    '//evil.example',
    '/%2F%2Fevil.example',
    '/\\evil.example',
    '/auth/signin?redirect=%2Fprofile%2Fa',
    '/auth/google/callback',
    '/onboarding',
  ]) {
    assert.equal(browserHandoffPath(returnPath), '/auth/signin', String(returnPath));
  }
});
