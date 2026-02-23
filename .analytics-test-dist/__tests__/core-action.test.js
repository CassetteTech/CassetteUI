"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const events_1 = require("../events");
(0, node_test_1.default)('core_action is applied only to successful configured core events', () => {
    const successCore = (0, events_1.withCoreAction)('link_converted', { status: 'failed', success: false });
    strict_1.default.equal(successCore.core_action, true);
    strict_1.default.equal(successCore.status, 'succeeded');
    strict_1.default.equal(successCore.success, true);
    const failedEvent = (0, events_1.withCoreAction)('link_conversion_failed', { core_action: true, status: 'failed', success: false });
    strict_1.default.equal(failedEvent.core_action, false);
    strict_1.default.equal(failedEvent.status, 'failed');
    const submittedEvent = (0, events_1.withCoreAction)('playlist_creation_submitted', { core_action: true });
    strict_1.default.equal(submittedEvent.core_action, false);
    strict_1.default.equal(submittedEvent.status, 'submitted');
    const postCtaClickEvent = (0, events_1.withCoreAction)('post_platform_conversion_clicked', { core_action: true });
    strict_1.default.equal(postCtaClickEvent.core_action, false);
    strict_1.default.equal(postCtaClickEvent.status, undefined);
    strict_1.default.equal(postCtaClickEvent.success, undefined);
});
