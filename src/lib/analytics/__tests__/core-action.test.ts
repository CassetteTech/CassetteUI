import test from 'node:test';
import assert from 'node:assert/strict';
import { withCoreAction } from '../events';

test('core_action is applied only to successful configured core events', () => {
  const successCore = withCoreAction('link_converted', { status: 'failed', success: false });
  assert.equal(successCore.core_action, true);
  assert.equal(successCore.status, 'succeeded');
  assert.equal(successCore.success, true);

  const failedEvent = withCoreAction('link_conversion_failed', { core_action: true, status: 'failed', success: false });
  assert.equal(failedEvent.core_action, false);
  assert.equal(failedEvent.status, 'failed');

  const submittedEvent = withCoreAction('playlist_creation_submitted', { core_action: true });
  assert.equal(submittedEvent.core_action, false);
  assert.equal(submittedEvent.status, 'submitted');

  const postCtaClickEvent = withCoreAction('post_platform_conversion_clicked', { core_action: true });
  assert.equal(postCtaClickEvent.core_action, false);
  assert.equal(postCtaClickEvent.status, undefined);
  assert.equal(postCtaClickEvent.success, undefined);
});
