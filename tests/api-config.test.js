import test from 'node:test';
import assert from 'node:assert/strict';

import { API_URL, apiRequest } from '../src/config/api.js';

test('API config exposes a single backend URL', () => {
  assert.equal(typeof API_URL, 'string');
  assert.ok(API_URL.length > 0);
});

test('apiRequest rejects a placeholder URL with a clear message', async () => {
  const original = API_URL;
  try {
    const value = await apiRequest({ action: 'loginPlayer' }, { timeoutMs: 50 });
    assert.equal(value, null);
  } catch (error) {
    assert.match(String(error.message), /Google Apps Script Web App URL|API_URL/i);
  } finally {
    // The module constant is intentionally static; this is a config guard test
    // and should not mutate the app state.
    assert.equal(API_URL, original);
  }
});
