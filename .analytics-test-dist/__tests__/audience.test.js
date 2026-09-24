"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const audience_1 = require("../audience");
function withSessionStorage(run) {
    const store = new Map();
    const globals = globalThis;
    const previousWindow = globals.window;
    globals.window = {
        sessionStorage: {
            getItem: (key) => store.get(key) ?? null,
            setItem: (key, value) => void store.set(key, value),
            removeItem: (key) => void store.delete(key),
        },
    };
    try {
        run();
    }
    finally {
        globals.window = previousWindow;
    }
}
(0, node_test_1.default)('user cohort is the remembered journey for that user only, and expires', () => {
    withSessionStorage(() => {
        const now = Date.parse('2026-09-04T12:00:00Z');
        strict_1.default.equal((0, audience_1.getUserCohort)(null, now), undefined);
        strict_1.default.equal((0, audience_1.getUserCohort)('user-a', now), 'existing');
        (0, audience_1.rememberUserCohort)('user-a', 'new', now);
        strict_1.default.equal((0, audience_1.getUserCohort)('user-a', now), 'new');
        strict_1.default.equal((0, audience_1.getUserCohort)(undefined, now), undefined);
        // Another account in the same tab never inherits the new-user journey.
        strict_1.default.equal((0, audience_1.getUserCohort)('user-b', now), 'existing');
        // Bounded: a day later the record is stale.
        strict_1.default.equal((0, audience_1.getUserCohort)('user-a', now + 25 * 60 * 60 * 1000), 'existing');
    });
});
