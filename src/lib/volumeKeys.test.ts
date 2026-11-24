import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { interpretVolumeKey } from './volumeKeys';

describe('volume keys', () => {
  it('maps the upper button to the left side and the lower button to the right', () => {
    assert.deepEqual(interpretVolumeKey('up'), { kind: 'point', team: 0 });
    assert.deepEqual(interpretVolumeKey('down'), { kind: 'point', team: 1 });
  });

  it('treats a hold as undo and ignores anything else', () => {
    assert.deepEqual(interpretVolumeKey('undo'), { kind: 'undo' });
    assert.equal(interpretVolumeKey('mute'), null);
  });
});
