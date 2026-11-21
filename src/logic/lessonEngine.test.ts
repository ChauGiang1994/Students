import test from 'node:test';
import assert from 'node:assert/strict';
import {
  areAllWavesExplored,
  computeOverallProgress,
  createInitialHeroMatches,
  createInitialStation1,
  createInitialStation2Slots,
  evaluateHeroMatch,
  evaluateMessageDrop,
  evaluateSequenceDrop,
  evaluateZoneDrop,
  getStoryChapterAtTime,
  getStrongholdFlagOwner,
  isHeroTaskComplete,
  isMessageTaskComplete,
  isStation1Complete,
  isStation2Complete,
  isStation3Complete,
} from './lessonEngine';

test('Station 1: zone drop accepts matching zones and rejects mismatched zones', () => {
  const ok = evaluateZoneDrop('north', 'north');
  assert.equal(ok.correct, true);
  assert.match(ok.message, /PHÂN KHU BẮC/);

  const wrong = evaluateZoneDrop('center', 'south');
  assert.equal(wrong.correct, false);
  assert.match(wrong.message, /Gợi ý/);
});

test('Station 1: completion requires all 3 zones placed correctly', () => {
  const state = createInitialStation1();
  assert.equal(isStation1Complete(state), false);
  state.north = 'north';
  state.center = 'center';
  assert.equal(isStation1Complete(state), false);
  state.south = 'south';
  assert.equal(isStation1Complete(state), true);
});

test('Station 2: sequence ordering matches exact teacher answer key (1:B, 2:A, 3:C)', () => {
  assert.equal(evaluateSequenceDrop(0, 'B').correct, true);
  assert.equal(evaluateSequenceDrop(1, 'A').correct, true);
  assert.equal(evaluateSequenceDrop(2, 'C').correct, true);

  assert.equal(evaluateSequenceDrop(0, 'A').correct, false);
  assert.equal(evaluateSequenceDrop(1, 'C').correct, false);
  assert.equal(evaluateSequenceDrop(2, 'B').correct, false);

  const slots = createInitialStation2Slots();
  assert.equal(isStation2Complete(slots), false);
  slots[0] = 'B';
  slots[1] = 'A';
  slots[2] = 'C';
  assert.equal(isStation2Complete(slots), true);
});

test('Station 2: wave exploration tracks all 3 waves', () => {
  assert.equal(areAllWavesExplored(['wave1', 'wave2']), false);
  assert.equal(areAllWavesExplored(['wave1', 'wave2', 'wave3']), true);
});

test('Station 3: hero matching validates all 4 textbook heroes', () => {
  const matches = createInitialHeroMatches();
  assert.equal(isHeroTaskComplete(matches), false);
  assert.equal(evaluateHeroMatch('to_vinh_dien', 'to_vinh_dien').correct, true);
  assert.equal(evaluateHeroMatch('to_vinh_dien', 'phan_dinh_giot').correct, false);

  matches.to_vinh_dien = 'to_vinh_dien';
  matches.phan_dinh_giot = 'phan_dinh_giot';
  matches.be_van_dan = 'be_van_dan';
  matches.ta_quoc_luat = 'ta_quoc_luat';
  assert.equal(isHeroTaskComplete(matches), true);
});

test('Station 3: historical message selection accepts 3 core messages and rejects distractor', () => {
  assert.equal(evaluateMessageDrop('msg_solidarity').correct, true);
  assert.equal(evaluateMessageDrop('msg_courage').correct, true);
  assert.equal(evaluateMessageDrop('msg_resilience').correct, true);
  assert.equal(evaluateMessageDrop('msg_distractor').correct, false);

  assert.equal(isMessageTaskComplete(['msg_solidarity', 'msg_courage']), false);
  assert.equal(
    isMessageTaskComplete(['msg_solidarity', 'msg_courage', 'msg_resilience']),
    true,
  );
});

test('Station 3: combined completion requires both hero matching and message selection', () => {
  const matches = {
    to_vinh_dien: 'to_vinh_dien' as const,
    phan_dinh_giot: 'phan_dinh_giot' as const,
    be_van_dan: 'be_van_dan' as const,
    ta_quoc_luat: 'ta_quoc_luat' as const,
  };
  assert.equal(isStation3Complete(matches, ['msg_solidarity']), false);
  assert.equal(
    isStation3Complete(matches, ['msg_solidarity', 'msg_courage', 'msg_resilience']),
    true,
  );
});

test('Overall progress computes percentage and completion accurately', () => {
  assert.deepEqual(
    computeOverallProgress({ station1Done: false, station2Done: false, station3Done: false }),
    { completedStations: 0, totalStations: 3, percent: 0, allCompleted: false },
  );
  assert.deepEqual(
    computeOverallProgress({ station1Done: true, station2Done: true, station3Done: false }),
    { completedStations: 2, totalStations: 3, percent: 67, allCompleted: false },
  );
  assert.deepEqual(
    computeOverallProgress({ station1Done: true, station2Done: true, station3Done: true }),
    { completedStations: 3, totalStations: 3, percent: 100, allCompleted: true },
  );
});

test('Artillery story chapter lookup maps elapsed seconds to chapters 1-3', () => {
  assert.equal(getStoryChapterAtTime(0).id, 1);
  assert.equal(getStoryChapterAtTime(11.5).id, 1);
  assert.equal(getStoryChapterAtTime(15).id, 2);
  assert.equal(getStoryChapterAtTime(30).id, 3);
  assert.equal(getStoryChapterAtTime(50).id, 3);
});

test('Historical stronghold flag control accurately transitions from France to Vietnam across Waves 1-3', () => {
  // Vietnamese outer mountain artillery posts always fly Vietnamese flag
  assert.equal(getStrongholdFlagOwner('vn_post_ne', null), 'vietnam');
  assert.equal(getStrongholdFlagOwner('vn_post_west', 'wave1'), 'vietnam');

  // Pre-campaign (Station 1 / before wave selection): all valley strongholds fly French flag
  for (const id of ['him_lam', 'doc_lap', 'ban_keo', 'doi_d1_e1', 'doi_c1', 'doi_a1', 'bunker', 'hong_cum']) {
    assert.equal(getStrongholdFlagOwner(id, null), 'france');
  }

  // Wave 1: Northern sector liberated by Vietnam; Center & South still France
  assert.equal(getStrongholdFlagOwner('him_lam', 'wave1'), 'vietnam');
  assert.equal(getStrongholdFlagOwner('doc_lap', 'wave1'), 'vietnam');
  assert.equal(getStrongholdFlagOwner('ban_keo', 'wave1'), 'vietnam');
  assert.equal(getStrongholdFlagOwner('doi_d1_e1', 'wave1'), 'france');
  assert.equal(getStrongholdFlagOwner('doi_a1', 'wave1'), 'france');
  assert.equal(getStrongholdFlagOwner('bunker', 'wave1'), 'france');
  assert.equal(getStrongholdFlagOwner('hong_cum', 'wave1'), 'france');

  // Wave 2: Eastern hills D1-E1 & C1 captured by Vietnam; Hill A1, Bunker & Hong Cum remain France until Wave 3
  assert.equal(getStrongholdFlagOwner('him_lam', 'wave2'), 'vietnam');
  assert.equal(getStrongholdFlagOwner('doi_d1_e1', 'wave2'), 'vietnam');
  assert.equal(getStrongholdFlagOwner('doi_c1', 'wave2'), 'vietnam');
  assert.equal(getStrongholdFlagOwner('doi_a1', 'wave2'), 'france');
  assert.equal(getStrongholdFlagOwner('bunker', 'wave2'), 'france');
  assert.equal(getStrongholdFlagOwner('hong_cum', 'wave2'), 'france');

  // Wave 3: Total victory — all strongholds fly Vietnamese flag
  for (const id of ['him_lam', 'doc_lap', 'ban_keo', 'doi_d1_e1', 'doi_c1', 'doi_a1', 'bunker', 'hong_cum']) {
    assert.equal(getStrongholdFlagOwner(id, 'wave3'), 'vietnam');
  }
});

