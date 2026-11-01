import { W, H, PAINTS, P, LIQUID_WHITE, BRUSHES, state, mulberry32, mix, spec, brushPath, LiveStroke, snapshotWet } from './engine.js';
import { makeAPI, clipState } from './api/index.js';
import { PRESETS } from './presets.js';
import { DOCS, API_NAMES } from './docs.js';

const $ = id => document.getElementById(id);
const cv = $('cv');
state.ctx = cv.getContext('2d');
const store = {
  get(key, fallback) { try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage full or blocked */ } },
};
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 1600);
}

// ---------- undo / redo ----------
const undoStack = [], redoStack = [];
const snapshot = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(cv, 0, 0); return c; };
function pushUndo() {
  undoStack.push(snapshot()); if (undoStack.length > 20) undoStack.shift();
  redoStack.length = 0; syncHistory();
}
function restoreFrom(from, to) {
  if (playing) stopRun();
  const c = from.pop(); if (!c) return;
  to.push(snapshot());
  state.ctx.globalAlpha = 1; state.ctx.drawImage(c, 0, 0); syncHistory();
}
function syncHistory() { $('undoBtn').disabled = !undoStack.length; $('redoBtn').disabled = !redoStack.length; }
$('undoBtn').onclick = () => restoreFrom(undoStack, redoStack);
$('redoBtn').onclick = () => restoreFrom(redoStack, undoStack);
$('clearBtn').onclick = () => { stopRun(); pushUndo(); state.ctx.globalAlpha = 1; state.ctx.fillStyle = LIQUID_WHITE; state.ctx.fillRect(0, 0, W, H); };
const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('saveBtn').onclick = () => cv.toBlob(blob => download(blob, `painting-${stamp()}.png`));

// ---------- recording ----------
// Each frame, the canvas is copied into a recording canvas of the chosen shape and sent to a MediaRecorder.
// Frames are requested by hand so a still canvas still produces video (e.g. the pause at the end).
const REC_SIZES = { canvas: [1500, 1000], square: [1080, 1080], vertical: [1080, 1920] };
const rec = { mr: null, chunks: [], raf: 0, autoStop: false };
function pickMime() {
  if (!window.MediaRecorder) return '';
  return ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || '';
}
function startRecording() {
  const mime = pickMime();
  if (!mime) { toast("This browser can't record video"); return false; }
  const [w, h] = REC_SIZES[$('recFormat').value];
  const out = Object.assign(document.createElement('canvas'), { width: w, height: h }), c = out.getContext('2d');
  const stream = out.captureStream(0), track = stream.getVideoTracks()[0];
  rec.chunks = [];
  rec.mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
  rec.mr.ondataavailable = e => { if (e.data.size) rec.chunks.push(e.data); };
  rec.mr.onstop = () => {
    const type = rec.chunks[0]?.type || mime;
    download(new Blob(rec.chunks, { type }), `painting-${stamp()}.${type.includes('mp4') ? 'mp4' : 'webm'}`);
    toast('Video saved');
  };
  rec.mr.start(250);
  const t0 = performance.now(), s = Math.min(w / W, h / H), dw = W * s, dh = H * s;
  const draw = () => {
    if (!rec.mr) return;
    c.fillStyle = '#141414'; c.fillRect(0, 0, w, h);
    c.drawImage(cv, (w - dw) / 2, (h - dh) / 2, dw, dh);
    track.requestFrame();
    const sec = Math.floor((performance.now() - t0) / 1000);
    $('recBtn').textContent = `■ Stop ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    rec.raf = requestAnimationFrame(draw);
  };
  draw();
  $('recBtn').classList.add('on'); $('recFormat').disabled = true;
  return true;
}
function stopRecording() {
  if (!rec.mr) return;
  const mr = rec.mr; rec.mr = null; rec.autoStop = false;
  cancelAnimationFrame(rec.raf); mr.stop();
  $('recBtn').classList.remove('on'); $('recBtn').textContent = '● Record'; $('recFormat').disabled = false;
}
$('recBtn').onclick = () => {
  if (rec.mr) { stopRecording(); return; }
  if (!startRecording()) return;
  // in code mode, Record means "record a run": paint the code and stop shortly after it finishes
  if (mode === 'code' && !playing) {
    rec.autoStop = true;
    if (!runCode(getCode())) stopRecording();
  }
};

// ---------- playback ----------
let queue = [], qi = 0, playing = false, rush = false;
const BUDGETS = [1500, 4000, 9000, 25000, 90000];
const meter = $('meter');
function frame() {
  requestAnimationFrame(frame);
  if (!playing) return;
  const t0 = performance.now(), w0 = state.work, budget = BUDGETS[+$('speed').value];
  let n = 0;
  try {
    while (qi < queue.length && (rush || (state.work - w0) + 200 * n < budget) && performance.now() - t0 < (rush ? 35 : 14)) { queue[qi++](); n++; }
  } catch (e) { showErr(e); stopRun(); return; }
  meter.style.width = (qi / Math.max(1, queue.length) * 100) + '%';
  $('stats').textContent = `${state.strokes.toLocaleString()} strokes`;
  if (qi >= queue.length) {
    stopRun();
    // hold the finished painting for a moment before the video ends
    if (rec.autoStop) setTimeout(stopRecording, 1500);
  }
}
requestAnimationFrame(frame);

// Your code runs inside a function whose parameters are the helper names; this finds which line is yours.
const LINE_OFFSET = (() => { try { new Function('"use strict";\nthrow new Error("probe")')(); } catch (e) { const m = /<anonymous>:(\d+)/.exec(e.stack || ''); return m ? +m[1] - 1 : 3; } return 3; })();

let errMark = null;
function runCode(src, { keep = $('keepCanvas').checked } = {}) {
  stopRun(); showErr(null);
  queue = []; qi = 0; state.dr = mulberry32(1);
  const api = makeAPI(queue, cv);
  try {
    new Function(...Object.keys(api), '"use strict";\n' + src)(...Object.values(api));
  } catch (e) { showErr(e); return false; }
  pushUndo(); hint.hidden = true;
  if (!keep) queue.unshift(() => { state.ctx.globalAlpha = 1; state.ctx.fillStyle = LIQUID_WHITE; state.ctx.fillRect(0, 0, W, H); });
  playing = true; rush = false;
  $('stopBtn').disabled = false; $('rushBtn').disabled = false;
  return true;
}
function stopRun() {
  playing = false;
  while (clipState.depth > 0) { state.ctx.restore(); clipState.depth--; }
  state.ctx.globalAlpha = 1; state.ctx.globalCompositeOperation = 'source-over';
  queue = []; qi = 0; meter.style.width = '0%';
  $('stopBtn').disabled = true; $('rushBtn').disabled = true;
}
function showErr(e) {
  if (errMark !== null && cm) { cm.removeLineClass(errMark, 'background', 'err-line'); errMark = null; }
  if (!e) { $('err').textContent = ''; return; }
  const msg = e.message || String(e), m = /<anonymous>:(\d+)/.exec(e.stack || '');
  const line = m ? +m[1] - LINE_OFFSET : null;
  $('err').textContent = line ? `Line ${line}: ${msg}` : msg;
  if (line && cm && line <= cm.lineCount()) { errMark = line - 1; cm.addLineClass(errMark, 'background', 'err-line'); }
}
$('runBtn').onclick = () => runCode(getCode());
$('stopBtn').onclick = stopRun;
$('rushBtn').onclick = () => { rush = true; };

// ---------- editor ----------
let cm = null;
const ed = $('editor');
const getCode = () => cm ? cm.getValue() : ed.value;
function setCode(text, undoable = true) {
  if (!cm) { ed.value = text; return; }
  if (undoable) cm.replaceRange(text, { line: 0, ch: 0 }, { line: cm.lastLine() }); else cm.setValue(text);
}
function insertAtCursor(text) {
  if (cm) { cm.replaceSelection(text); cm.focus(); }
  else { ed.setRangeText(text, ed.selectionStart, ed.selectionEnd, 'end'); ed.focus(); }
}
function apiHint(editor) {
  const cur = editor.getCursor(), line = editor.getLine(cur.line);
  let start = cur.ch; while (start && /[\w$]/.test(line[start - 1])) start--;
  const word = line.slice(start, cur.ch);
  const afterP = line.slice(0, start).endsWith('P.');
  const pool = afterP ? PAINTS.map(([key]) => ({ text: key, displayText: key })) :
    API_NAMES.map(n => ({ text: n, displayText: DOCS.flatMap(g => g.items).find(i => i.name === n)?.sig || n }));
  const list = pool.filter(h => h.text.toLowerCase().startsWith(word.toLowerCase()));
  return { list, from: CodeMirror.Pos(cur.line, start), to: CodeMirror.Pos(cur.line, cur.ch) };
}
if (window.CodeMirror) {
  cm = CodeMirror.fromTextArea(ed, {
    mode: 'javascript', lineNumbers: true, tabSize: 2, indentUnit: 2, matchBrackets: true, autoCloseBrackets: true, lineWrapping: false,
    extraKeys: {
      'Cmd-Enter': () => runCode(getCode()), 'Ctrl-Enter': () => runCode(getCode()),
      'Cmd-S': () => saveSketch(), 'Ctrl-S': () => saveSketch(),
      'Ctrl-Space': c => c.showHint({ hint: apiHint, completeSingle: false }),
      Tab: c => c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection('  '),
    },
  });
  cm.on('inputRead', (c, change) => {
    if (change.origin !== '+input') return;
    const cur = c.getCursor(), before = c.getLine(cur.line).slice(0, cur.ch);
    if (/(^|[^\w.])[A-Za-z]{2,}$/.test(before) || /P\.\w*$/.test(before)) c.showHint({ hint: apiHint, completeSingle: false });
  });
  cm.on('change', () => store.set('hlp-code', cm.getValue()));
} else {
  ed.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); runCode(getCode()); } });
  ed.addEventListener('input', () => store.set('hlp-code', ed.value));
}

const presetSel = $('preset');
presetSel.append(new Option('Choose a starting point…', ''));
for (const name of Object.keys(PRESETS)) presetSel.append(new Option(name, name));
presetSel.onchange = () => {
  const name = presetSel.value; if (!name) return;
  setCode(PRESETS[name]); presetSel.value = '';
  runCode(PRESETS[name], { keep: false });
};
setCode(store.get('hlp-code', PRESETS['Black hole']), false);

// ---------- library ----------
function renderLibrary(filter = '') {
  const q = filter.trim().toLowerCase(), lib = $('lib');
  lib.textContent = '';
  for (const g of DOCS) {
    const items = g.items.filter(i => !q || (i.name + ' ' + i.desc + ' ' + g.group).toLowerCase().includes(q));
    if (!items.length) continue;
    const sec = document.createElement('section'); sec.className = 'lib-group';
    sec.append(Object.assign(document.createElement('h3'), { textContent: g.group }));
    for (const it of items) {
      const div = document.createElement('div'); div.className = 'lib-item';
      const code = document.createElement('code');
      const i = it.sig.indexOf('(');
      code.append(Object.assign(document.createElement('b'), { textContent: i > 0 ? it.sig.slice(0, i) : it.sig }), i > 0 ? it.sig.slice(i) : '');
      const acts = document.createElement('div'); acts.className = 'acts';
      const ins = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Insert example' });
      ins.onclick = () => { showPane('paneCode'); insertAtCursor(it.ex + '\n'); };
      const tryB = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Try on canvas' });
      tryB.onclick = () => { if (runCode(it.ex, { keep: true })) toast(`Painting ${it.name}`); };
      acts.append(ins, tryB);
      div.append(code, Object.assign(document.createElement('p'), { textContent: it.desc }), acts);
      sec.append(div);
    }
    lib.append(sec);
  }
  if (!lib.children.length) lib.append(Object.assign(document.createElement('p'), { className: 'empty', textContent: `Nothing matches “${filter}”.` }));
}
$('libSearch').oninput = e => renderLibrary(e.target.value);
renderLibrary();

// ---------- sketches ----------
function renderSketches() {
  const list = store.get('hlp-sketches', []), ul = $('sketches');
  ul.textContent = ''; $('noSketches').hidden = list.length > 0;
  list.forEach((s, idx) => {
    const li = document.createElement('li');
    const load = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Open' });
    load.onclick = () => { setCode(s.code); showPane('paneCode'); toast(`Opened ${s.name}`); };
    const del = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Delete' });
    del.onclick = () => {
      if (del.dataset.armed) { const l = store.get('hlp-sketches', []); l.splice(idx, 1); store.set('hlp-sketches', l); renderSketches(); }
      else { del.dataset.armed = '1'; del.textContent = 'Really delete?'; setTimeout(() => { delete del.dataset.armed; del.textContent = 'Delete'; }, 2500); }
    };
    li.append(Object.assign(document.createElement('span'), { textContent: s.name }), Object.assign(document.createElement('small'), { textContent: new Date(s.saved).toLocaleDateString() }), load, del);
    ul.append(li);
  });
}
function saveSketch() {
  const list = store.get('hlp-sketches', []);
  const name = $('sketchName').value.trim() || `Sketch ${list.length + 1}`;
  const existing = list.findIndex(s => s.name === name);
  const entry = { name, code: getCode(), saved: Date.now() };
  if (existing >= 0) list[existing] = entry; else list.unshift(entry);
  store.set('hlp-sketches', list); $('sketchName').value = '';
  renderSketches(); toast(`Saved ${name}`);
}
$('sketchForm').addEventListener('submit', e => { e.preventDefault(); saveSketch(); });
renderSketches();

// ---------- panes and modes ----------
function showPane(id) {
  document.querySelectorAll('.subtabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.pane === id)));
  for (const p of ['paneCode', 'paneLib', 'paneSketch']) $(p).hidden = p !== id;
  if (id === 'paneCode' && cm) cm.refresh();
}
document.querySelectorAll('.subtabs button').forEach(b => { b.onclick = () => showPane(b.dataset.pane); });

let mode = 'hand';
const hint = $('hint');
function setMode(m) {
  mode = m;
  $('tabHand').setAttribute('aria-selected', String(m === 'hand'));
  $('tabCode').setAttribute('aria-selected', String(m === 'code'));
  $('handPanel').hidden = m !== 'hand';
  $('codePanel').hidden = m !== 'code';
  hint.textContent = m === 'hand' ? 'Pick a brush and a paint, then drag on the canvas.' : 'Choose a starting point and press Run.';
  if (m === 'code' && cm) cm.refresh();
  store.set('hlp-mode', m);
}
$('tabHand').onclick = () => setMode('hand');
$('tabCode').onclick = () => setMode('code');

// ---------- hand painting ----------
const hand = { brush: 'flat', size: 64, wet: 0.35, color: P.prussianBlue, name: 'Prussian Blue' };
let mixNext = false, live = null;

for (const [key, b] of Object.entries(BRUSHES)) {
  const btn = document.createElement('button');
  btn.type = 'button'; btn.setAttribute('aria-pressed', String(key === hand.brush));
  const pc = document.createElement('canvas'); pc.width = 220; pc.height = 56;
  btn.append(pc, Object.assign(document.createElement('span'), { textContent: b.label }));
  $('brushes').append(btn);
  const keepCtx = state.ctx, keepDr = state.dr;
  state.ctx = pc.getContext('2d'); state.dr = mulberry32(key.length * 31);
  brushPath([[12, 32], [70, 18], [140, 36], [208, 22]], spec({ brush: key, size: Math.min(b.size, 30), color: '#171716', alpha: key === 'soft' ? 0.5 : undefined, tints: false }));
  state.ctx = keepCtx; state.dr = keepDr;
  btn.onclick = () => {
    hand.brush = key; hand.size = b.size; $('size').value = b.size; $('sizeOut').textContent = b.size + ' px';
    $('brushes').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === btn)));
  };
}
function setLoaded() { $('loadedSw').style.setProperty('--c', hand.color); $('loadedName').textContent = hand.name; $('loadedHex').textContent = hand.color; }
for (const [, name, c] of PAINTS) {
  const li = document.createElement('li'), btn = document.createElement('button');
  btn.type = 'button'; btn.innerHTML = `<span class="blob" style="--c:${c}"></span><span>${name}</span>`;
  btn.onclick = e => {
    if (mixNext || e.shiftKey) {
      hand.color = mix(hand.color, c, 0.5);
      if (!hand.name.includes(name)) hand.name = `${hand.name} + ${name}`;
      mixNext = false; $('mixBtn').setAttribute('aria-pressed', 'false');
    } else { hand.color = c; hand.name = name; }
    setLoaded();
  };
  li.append(btn); $('paints').append(li);
}
setLoaded();
$('mixBtn').onclick = () => { mixNext = !mixNext; $('mixBtn').setAttribute('aria-pressed', String(mixNext)); };
$('size').oninput = e => { hand.size = +e.target.value; $('sizeOut').textContent = hand.size + ' px'; };
$('wet').oninput = e => { hand.wet = e.target.value / 100; $('wetOut').textContent = e.target.value + '%'; };

const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
const pressure = e => e.pointerType === 'pen' ? 0.35 + (e.pressure || 0.5) * 1.1 : 1;
cv.addEventListener('pointerdown', e => {
  if (mode === 'code') {
    if ($('clickCoords').checked) { const [x, y] = pos(e); insertAtCursor(`${Math.round(x)}, ${Math.round(y)}`); toast(`Inserted ${Math.round(x)}, ${Math.round(y)}`); }
    return;
  }
  if (playing) return;
  e.preventDefault(); cv.setPointerCapture(e.pointerId);
  pushUndo(); hint.hidden = true;
  if (hand.wet > 0) snapshotWet(cv);
  live = new LiveStroke(pos(e), hand);
});
cv.addEventListener('pointermove', e => {
  const [x, y] = pos(e);
  $('coords').textContent = `x ${Math.round(x)}, y ${Math.round(y)}`;
  if (!live) return;
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
  for (const ev of (evs.length ? evs : [e])) live.to(pos(ev), pressure(ev));
});
const endStroke = () => { live = null; };
cv.addEventListener('pointerup', endStroke);
cv.addEventListener('pointercancel', endStroke);
cv.addEventListener('pointerleave', () => { $('coords').textContent = 'x –, y –'; });

document.addEventListener('keydown', e => {
  const inEditor = document.activeElement && (document.activeElement.closest('.CodeMirror') || document.activeElement === ed || document.activeElement.tagName === 'INPUT');
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !inEditor) { e.preventDefault(); e.shiftKey ? restoreFrom(redoStack, undoStack) : restoreFrom(undoStack, redoStack); }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && mode === 'code') { e.preventDefault(); saveSketch(); }
});

// ---------- start ----------
state.ctx.fillStyle = LIQUID_WHITE; state.ctx.fillRect(0, 0, W, H);
setMode(store.get('hlp-mode', 'hand'));
