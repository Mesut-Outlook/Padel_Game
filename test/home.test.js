import test from 'node:test';
import assert from 'node:assert/strict';

// Set up mock window / document / localStorage before importing home.js
class MockStorage {
  constructor(init = {}) {
    this.map = new Map(Object.entries(init));
  }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
  clear() { this.map.clear(); }
}

class MockElement {
  constructor(tagName = 'div', id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.className = '';
    this.classList = {
      _classes: new Set(),
      add: (...cls) => cls.forEach(c => this.classList._classes.add(c)),
      remove: (...cls) => cls.forEach(c => this.classList._classes.delete(c)),
      toggle: (c, force) => {
        if (force === undefined) {
          if (this.classList._classes.has(c)) this.classList._classes.delete(c);
          else this.classList._classes.add(c);
        } else if (force) {
          this.classList._classes.add(c);
        } else {
          this.classList._classes.delete(c);
        }
      },
      contains: (c) => this.classList._classes.has(c),
    };
    this.hidden = false;
    this._html = '';
    this._text = '';
    this.children = [];
    this.parentElement = null;
    this.dataset = {};
    this.value = '';
    this.onclick = null;
    this.onblur = null;
    this.onkeydown = null;
    this.attributes = new Map();
  }

  get innerHTML() { return this._html; }
  set innerHTML(val) {
    this._html = String(val);
    this._parseChildren(val);
  }

  get textContent() { return this._text || this._extractText(this._html); }
  set textContent(val) { this._text = String(val); this._html = String(val); }

  setAttribute(k, v) { this.attributes.set(k, String(v)); }
  getAttribute(k) { return this.attributes.get(k) ?? null; }

  focus() { globalThis.document.activeElement = this; }
  select() {}

  _extractText(html) {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  _parseChildren(html) {
    // Basic parser to find elements with id, class, data-* attributes
    this.children = [];
    const tagRegex = /<([a-zA-Z0-9-]+)([^>]*)>(?:([\s\S]*?)<\/\1>)?/g;
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
      const tagName = match[1];
      const attrStr = match[2];
      const inner = match[3] || '';
      const child = new MockElement(tagName);
      child.parentElement = this;

      const idMatch = attrStr.match(/id=["']([^"']+)["']/);
      if (idMatch) child.id = idMatch[1];

      const classMatch = attrStr.match(/class=["']([^"']+)["']/);
      if (classMatch) {
        child.className = classMatch[1];
        classMatch[1].split(/\s+/).filter(Boolean).forEach(c => child.classList.add(c));
      }

      const dataCodeMatch = attrStr.match(/data-code=["']([^"']+)["']/);
      if (dataCodeMatch) child.dataset.code = dataCodeMatch[1];

      const hiddenMatch = attrStr.match(/\bhidden\b/);
      if (hiddenMatch) child.hidden = true;

      child._html = inner;
      this.children.push(child);
      if (inner.includes('<')) child._parseChildren(inner);
    }
  }

  querySelector(selector) {
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      return this._findById(id);
    }
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      return this._findByClass(cls);
    }
    return this._findByTag(selector.toUpperCase());
  }

  querySelectorAll(selector) {
    const res = [];
    this._collectAll(selector, res);
    return res;
  }

  _collectAll(selector, res) {
    for (const c of this.children) {
      if (selector.startsWith('.') && c.classList.contains(selector.slice(1))) {
        res.push(c);
      } else if (selector.startsWith('#') && c.id === selector.slice(1)) {
        res.push(c);
      } else if (c.tagName.toLowerCase() === selector.toLowerCase()) {
        res.push(c);
      }
      c._collectAll(selector, res);
    }
  }

  _findById(id) {
    for (const c of this.children) {
      if (c.id === id) return c;
      const found = c._findById(id);
      if (found) return found;
    }
    return null;
  }

  _findByClass(cls) {
    for (const c of this.children) {
      if (c.classList.contains(cls)) return c;
      const found = c._findByClass(cls);
      if (found) return found;
    }
    return null;
  }

  _findByTag(tag) {
    for (const c of this.children) {
      if (c.tagName === tag) return c;
      const found = c._findByTag(tag);
      if (found) return found;
    }
    return null;
  }
}

const mockStorage = new MockStorage();
const homeRoot = new MockElement('div', 'home');

globalThis.localStorage = mockStorage;
globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
};
globalThis.document = {
  getElementById: (id) => (id === 'home' ? homeRoot : null),
  activeElement: null,
  createElement: (tag) => new MockElement(tag),
};
if (!globalThis.navigator) {
  globalThis.navigator = {};
}
globalThis.navigator.getGamepads = () => [];

const { initHome, getQuickPick, getOnlineName, setOpenGames, setSchedule, setCalendarNotice } = await import('../src/home.js');

test('getQuickPick defaults to singles when storage empty or corrupt', () => {
  mockStorage.clear();
  initHome({});
  assert.deepEqual(getQuickPick(), { players: 2, mode: 'team' });

  mockStorage.setItem('padel.quick.v1', '{ bad json');
  initHome({});
  assert.deepEqual(getQuickPick(), { players: 2, mode: 'team' });
});

test('getQuickPick respects saved padel.quick.v1 preferences', () => {
  mockStorage.setItem('padel.quick.v1', JSON.stringify({ players: 4, mode: 'face' }));
  initHome({});
  assert.deepEqual(getQuickPick(), { players: 4, mode: 'face' });

  mockStorage.setItem('padel.quick.v1', JSON.stringify({ players: 4, mode: 'team' }));
  initHome({});
  assert.deepEqual(getQuickPick(), { players: 4, mode: 'team' });
});

test('getOnlineName generates random player name if storage empty, and preserves existing name', () => {
  mockStorage.clear();
  const name1 = getOnlineName();
  assert.match(name1, /^Player \d{4}$/);
  assert.equal(mockStorage.getItem('padel.onlineName'), name1);

  // When storage already has a name, it uses it
  mockStorage.setItem('padel.onlineName', 'PadelAce99');
  assert.equal(getOnlineName(), 'PadelAce99');
});

test('setOpenGames: shows offline message when serverReady is false', () => {
  initHome({});
  setOpenGames([], false);
  const listEl = homeRoot.querySelector('#hm-games-list');
  assert.ok(listEl);
  assert.match(listEl.innerHTML, /Online play is not open yet/);
});

test('setOpenGames: nobody waiting → no misleading line, PLAY NOW says you warm up until someone joins', () => {
  initHome({});
  setOpenGames([], true);
  assert.equal(homeRoot.querySelector('#hm-games-list').innerHTML.trim(), '');
  assert.match(homeRoot.querySelector('#hm-play-sub').innerHTML, /Warm up until someone joins/);
  setOpenGames([{ code: 'AB12CD', players: 2, free: 1, host: 'Lena', char: 0 }], true);
  assert.match(homeRoot.querySelector('#hm-play-sub').innerHTML, /Lena is waiting for you · start now/);
});

test('setOpenGames: renders rows with escaped names, correct type strings, and triggers onJoin', () => {
  let joinedCode = null;
  initHome({
    onJoin: (code) => { joinedCode = code; },
  });

  const rows = [
    { code: 'XYZ123', players: 2, mode: 'team', free: 1, host: 'Lucía<script>', char: 27 },
    { code: 'ABC456', players: 4, mode: 'team', free: 1, host: 'Matteo', char: 25 },
    { code: 'DEF789', players: 4, mode: 'face', free: 2, host: 'Camille', char: 28 },
  ];

  setOpenGames(rows, true);
  const listEl = homeRoot.querySelector('#hm-games-list');
  assert.ok(listEl);

  // Verify escaping: raw <script> must NOT appear in HTML
  assert.ok(!listEl.innerHTML.includes('<script>'));
  assert.ok(listEl.innerHTML.includes('&lt;script&gt;'));

  // Verify type strings
  assert.match(listEl.innerHTML, /Singles 1\/2/);
  assert.match(listEl.innerHTML, /Doubles · Team up 1\/2/);
  assert.match(listEl.innerHTML, /Doubles · Face off 2\/4/);

  // Verify join buttons click handler
  const joinBtns = listEl.querySelectorAll('.hm-btn-join');
  assert.equal(joinBtns.length, 3);
  joinBtns[0].onclick();
  assert.equal(joinedCode, 'XYZ123');

  joinBtns[2].onclick();
  assert.equal(joinedCode, 'DEF789');
});

test('initHome action callbacks: onPlayNow, onInvite, onPlayAI, onCustomize, onCareer, onTraining', () => {
  let playNowPick = null;
  let invitePick = null;
  let playAiCalled = false;
  let customizeCalled = false;
  let careerCalled = false;
  let trainingCalled = false;

  mockStorage.setItem('padel.quick.v1', JSON.stringify({ players: 4, mode: 'team' }));

  initHome({
    onPlayNow: (pick) => { playNowPick = pick; },
    onInvite: (pick) => { invitePick = pick; },
    onPlayAI: () => { playAiCalled = true; },
    onCustomize: () => { customizeCalled = true; },
    onCareer: () => { careerCalled = true; },
    onTraining: () => { trainingCalled = true; },
  });

  // Click PLAY NOW
  homeRoot.querySelector('#hm-btn-play-now')?.onclick();
  assert.deepEqual(playNowPick, { players: 4, mode: 'team' });

  // Click Invite
  homeRoot.querySelector('#hm-btn-invite')?.onclick();
  assert.deepEqual(invitePick, { players: 4, mode: 'team' });

  // Click Play vs AI
  homeRoot.querySelector('#hm-btn-play-ai')?.onclick();
  assert.equal(playAiCalled, true);

  // Click Customize
  homeRoot.querySelector('#hm-link-customize')?.onclick();
  assert.equal(customizeCalled, true);

  // Click Career
  homeRoot.querySelector('#hm-btn-career')?.onclick();
  assert.equal(careerCalled, true);

  // Click Training
  homeRoot.querySelector('#hm-btn-training')?.onclick();
  assert.equal(trainingCalled, true);
});

test('selector toggling updates quickPick and stores in localStorage', () => {
  initHome({});

  // Switch to Doubles
  homeRoot.querySelector('#hm-pick-doubles')?.onclick();
  assert.deepEqual(getQuickPick(), { players: 4, mode: 'team' });
  assert.equal(JSON.parse(mockStorage.getItem('padel.quick.v1')).players, 4);

  // Switch to Face off
  homeRoot.querySelector('#hm-pick-face')?.onclick();
  assert.deepEqual(getQuickPick(), { players: 4, mode: 'face' });
  assert.equal(JSON.parse(mockStorage.getItem('padel.quick.v1')).mode, 'face');

  // Switch back to Singles
  homeRoot.querySelector('#hm-pick-singles')?.onclick();
  assert.deepEqual(getQuickPick(), { players: 2, mode: 'face' });
  assert.equal(JSON.parse(mockStorage.getItem('padel.quick.v1')).players, 2);
});

test('HOME shows the Training card under PLAY NOW; after the tutorial it is a plain Training again button', () => {
  mockStorage.removeItem('padel.tutorial');
  initHome({});
  let html = homeRoot.innerHTML;
  assert.match(html, /id="hm-btn-play-now"[\s\S]*class="hm-train-card" id="hm-btn-training"/);
  assert.match(html, /New here\? Learn the shots in a few minutes/);
  assert.equal(html.split('id="hm-btn-training"').length - 1, 1);  // not in the bottom bar any more
  const { LESSON_IDS } = { LESSON_IDS: ['move', 'serve', 'slice', 'forehand', 'backhand', 'aim', 'lob', 'chiquita', 'volley', 'smash', 'glass', 'contra', 'ui', 'match'] };
  mockStorage.setItem('padel.tutorial', JSON.stringify(LESSON_IDS));
  initHome({});
  html = homeRoot.innerHTML;
  assert.match(html, /class="hm-btn-sec" id="hm-btn-training"[^>]*>Training again</);
  assert.doesNotMatch(html, /hm-train-card/);
  mockStorage.removeItem('padel.tutorial');
});

// Match calendar (plan 2026-11-08-scheduled-games, task 6)
const HM = 3600000, NOW = Date.now();
const slotAt = (h) => Math.ceil((NOW + h * HM) / 1800000) * 1800000;
const game = (extra = {}) => ({ id: 'g1', at: slotAt(3), players: 2, mode: 'face', open: false, host: { name: 'Mesut', char: 0, level: 3 }, seats: [], free: 1, mine: null, ...extra });

test('calendar: an empty week shows three quick slots and the first-game invitation, not a list', () => {
  let posted = null;
  initHome({ onPost: (p) => { posted = p; } });
  setSchedule({ games: [], clients: 0, offset: 0, serverReady: true });
  const cal = homeRoot.querySelector('#hm-cal');
  assert.match(cal.innerHTML, /Be the first to post a game tonight/);
  const quick = cal.querySelectorAll('.hm-sc-quick');
  assert.equal(quick.length, 3);
  quick[0].onclick();
  assert.equal(posted.at, Number(quick[0].dataset.code));
  assert.equal(posted.players, getQuickPick().players);
});

test('calendar: the player count shows only when someone else is on the site', () => {
  initHome({});
  setSchedule({ games: [], clients: 0, offset: 0, serverReady: true });
  assert.equal(homeRoot.querySelector('#hm-online-count').hidden, true);
  setSchedule({ games: [], clients: 4, offset: 0, serverReady: true });
  assert.match(homeRoot.querySelector('#hm-online-count').innerHTML, /5 players on the site now/);
});

test('calendar: a listed game offers Ask to join (or Join when open) with the host name escaped', () => {
  let asked = null;
  initHome({ onAsk: (id) => { asked = id; } });
  setSchedule({ games: [game({ host: { name: 'Mes<b>ut', char: 0, level: 3 } }), game({ id: 'g2', at: slotAt(4), open: true })], clients: 0, offset: 0, serverReady: true });
  const cal = homeRoot.querySelector('#hm-cal');
  assert.ok(cal.innerHTML.includes('Mes&lt;b&gt;ut'));
  assert.match(cal.innerHTML, /Ask to join/); assert.match(cal.innerHTML, />Join</);
  cal.querySelector('.hm-sc-ask').onclick();
  assert.equal(asked, 'g1');
});

test('calendar: the host row lists requests with accept and decline', () => {
  const answers = [];
  initHome({ onAnswer: (id, reqId, ok) => answers.push([id, reqId, ok]) });
  setSchedule({ games: [game({ mine: 'host', requests: [{ reqId: 'ab12cd34', name: 'Tomás', char: 1, level: 3.4, ago: 60000 }] })], clients: 0, offset: 0, serverReady: true });
  const cal = homeRoot.querySelector('#hm-cal');
  assert.match(cal.innerHTML, /Requests/); assert.match(cal.innerHTML, /Tomás/);
  assert.match(cal.innerHTML, /Unanswered requests are accepted 1 hour before the game\./);
  cal.querySelector('.hm-sc-yes').onclick(); cal.querySelector('.hm-sc-no').onclick();
  assert.deepEqual(answers, [['g1', 'ab12cd34', true], ['g1', 'ab12cd34', false]]);
});

test('calendar: a booked seat offers Add to calendar and Cancel; Enter appears from 10 minutes before', () => {
  let cancelled = null, entered = null;
  initHome({ onCancel: (id) => { cancelled = id; }, onEnter: (id) => { entered = id; } });
  setSchedule({ games: [game({ mine: 'seat' })], clients: 0, offset: 0, serverReady: true });
  let cal = homeRoot.querySelector('#hm-cal');
  assert.match(cal.innerHTML, /Your seat is ready/); assert.match(cal.innerHTML, /Add to calendar/);
  assert.equal(cal.querySelector('.hm-sc-enter'), null);
  cal.querySelector('.hm-sc-cancel').onclick();
  assert.equal(cancelled, 'g1');
  setSchedule({ games: [game({ mine: 'seat', at: Date.now() + 5 * 60000 })], clients: 0, offset: 0, serverReady: true });
  cal = homeRoot.querySelector('#hm-cal');
  cal.querySelector('.hm-sc-enter').onclick();
  assert.equal(entered, 'g1');
});

test('calendar: hidden entirely without a game server', () => {
  initHome({});
  setSchedule({ games: [], clients: 0, offset: 0, serverReady: false });
  assert.equal(homeRoot.querySelector('#hm-cal').innerHTML.trim(), '');
});

test('calendar: a server answer shows as a notice line at the top', () => {
  initHome({});
  setSchedule({ games: [], clients: 0, offset: 0, serverReady: true });
  setCalendarNotice('That time slot is full. Pick another time.');
  assert.match(homeRoot.querySelector('#hm-cal').innerHTML, /class="hm-sc-notice"[^>]*>That time slot is full\. Pick another time\.</);
  setCalendarNotice('');
  assert.doesNotMatch(homeRoot.querySelector('#hm-cal').innerHTML, /hm-sc-notice/);
});

test('fix: Team up doubles shows two places (the humans sit together), and Ask goes once the game has started', () => {
  initHome({});
  setSchedule({ games: [game({ players: 4, mode: 'team', free: 1 }), game({ id: 'g2', at: Date.now() - 60000, free: 1 })], clients: 0, offset: 0, serverReady: true });
  const cal = homeRoot.querySelector('#hm-cal');
  const rows = cal.innerHTML.split('hm-sc-game').slice(1);
  const team = rows.find(r => r.includes('Team up'));
  assert.equal((team.match(/hm-sc-dot[" ]/g) || []).length, 2);
  assert.equal(cal.querySelectorAll('.hm-sc-ask').length, 1, 'only the game that has not started');
});

test('fix: the same calendar data does not rebuild the calendar (focus stays where it is)', () => {
  initHome({});
  const data = { games: [game()], clients: 0, offset: 0, serverReady: true };
  setSchedule(data);
  const cal = homeRoot.querySelector('#hm-cal');
  cal.innerHTML = 'KEEP';
  setSchedule({ ...data, games: [game()] });
  assert.equal(cal.innerHTML, 'KEEP');
  setSchedule({ ...data, games: [game({ free: 0 })] });
  assert.notEqual(cal.innerHTML, 'KEEP');
});
