/* ── TOOLTIP ENGINE ───────────────────────────────────────── */
const TOOLTIP = (() => {
  let el;
  function ensureEl() {
    if (!el) el = document.getElementById('tooltip');
    return el;
  }
  function show(x, y, l1, l2, l3) {
    const t = ensureEl(); if (!t) return;
    t.innerHTML = `<div class="tip-line1">${l1}</div><div class="tip-line2">${l2 || ''}</div>${l3 ? `<div class="tip-line3">${l3}</div>` : ''}`;
    const vw = window.innerWidth, vh = window.innerHeight;
    let tx = x + 14, ty = y - 10;
    if (tx + 320 > vw) tx = x - 330;
    if (ty + 130 > vh) ty = y - 140;
    t.style.left = tx + 'px'; t.style.top = ty + 'px';
    t.classList.add('visible');
  }
  function hide() { const t = ensureEl(); if (t) t.classList.remove('visible'); }
  return { show, hide };
})();

function hookTips() {
  document.querySelectorAll('[data-tip]').forEach(el => {
    if (el._tipHooked) return;
    el._tipHooked = true;
    const raw = el.getAttribute('data-tip').split('||');
    el.addEventListener('mouseenter', e => TOOLTIP.show(e.clientX, e.clientY, raw[0], raw[1] || '', raw[2] || ''));
    el.addEventListener('mousemove', e => TOOLTIP.show(e.clientX, e.clientY, raw[0], raw[1] || '', raw[2] || ''));
    el.addEventListener('mouseleave', () => TOOLTIP.hide());
  });
}

/* ── CLOCK + MARKET STATUS ────────────────────────────────── */
function updateClock() {
  try {
    const now = new Date();
    const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const h = ist.getHours(), m = ist.getMinutes(), s = ist.getSeconds();
    const pad = v => String(v).padStart(2, '0');
    const clockEl = document.getElementById('clock');
    if (clockEl) clockEl.textContent = `${pad(h)}:${pad(m)}:${pad(s)} IST`;
    const day = ist.getDay(), mins = h * 60 + m;
    const open = day >= 1 && day <= 5 && mins >= 555 && mins < 930;
    const dot = document.getElementById('mkt-dot');
    const lbl = document.getElementById('mkt-status');
    if (dot) dot.className = 'live-dot ' + (open ? '' : 'red');
    if (lbl) { lbl.textContent = 'NSE MARKET: ' + (open ? 'OPEN' : 'CLOSED'); lbl.style.color = open ? '#00e676' : '#ff1744'; }
  } catch (e) { }
}

/* ── TWEET FEED ────────────────────────────────────────────── */
function buildFeed(cycle) {
  const tweets = cycle === '2019' ? TWEETS_2019 : TWEETS_2024;
  const doubled = [...tweets, ...tweets];
  const wrap = document.getElementById('feed-inner');
  if (!wrap) return;
  wrap.innerHTML = doubled.map(t => {
    const badgeClass = { bullish: 'badge-green', bearish: 'badge-red', neutral: 'badge-dim', panic: 'badge-panic' }[t.badge] || 'badge-dim';
    const mn = Math.min(...t.spark), mx = Math.max(...t.spark);
    const pts = t.spark.map((v, i) => `${i * 4},${20 - (v - mn) / (mx - mn + 0.01) * 18}`).join(' ');
    const sparkCol = t.spark[t.spark.length - 1] >= t.spark[0] ? '#00e676' : '#ff1744';
    return `<div class="tweet-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px"><span class="tweet-handle">${t.handle}</span><span class="tweet-time">${t.time}</span></div><span class="badge ${badgeClass}" style="font-size:8px;padding:1px 6px;margin-bottom:4px;display:inline-block">${t.badge.toUpperCase()}</span><div class="tweet-text">${t.text.length > 120 ? t.text.slice(0, 117) + '…' : t.text}</div><svg viewBox="0 0 36 20" style="width:100%;height:24px;margin-top:4px"><polyline points="${pts}" fill="none" stroke="${sparkCol}" stroke-width="1.5"/></svg></div>`;
  }).join('');
}

/* ── SECTOR DELTA LIST ──────────────────────────────────────── */
function renderSectorDeltas(cycle) {
  const perf = cycle === '2024' ? SECTORS.perf2024 : SECTORS.perf2019;
  const el = document.getElementById('sector-deltas');
  if (!el) return;
  el.innerHTML = SECTORS.labels.map((l, i) => {
    const v = perf[i];
    return `<div class="sect-delta"><span style="color:var(--muted)">${l}</span><span style="color:${v >= 0 ? 'var(--green)' : 'var(--red)'}">${v > 0 ? '▲ +' : '▼ '}${v}%</span></div>`;
  }).join('');
}

/* ── CURRENT SIGNAL ─────────────────────────────────────────── */
function renderSignal() {
  const el = document.getElementById('signal-pill');
  const desc = document.getElementById('signal-desc');
  if (!el) return;
  const act = PREDICTIONS.actual;
  if (!act || act.length < 6) return;
  const pred = PREDICTIONS.predicted;
  if (!pred || pred.length < 6) return;
  const lastPredRet = (pred[pred.length - 1] - pred[pred.length - 6]) / (pred[pred.length - 6] + 0.01) * 100;
  const dir = lastPredRet > 0.2 ? 'bull' : lastPredRet < -0.2 ? 'bear' : 'neut';
  el.className = `signal-pill signal-${dir}`;
  el.textContent = dir === 'bull' ? '↑ BULLISH' : dir === 'bear' ? '↓ BEARISH' : '~ NEUTRAL';
  if (desc) desc.textContent = `5-day forward return forecast: ${lastPredRet > 0 ? '+' : ''}${lastPredRet.toFixed(2)}%`;
}

/* ── SPECTROGRAM TOGGLE ─────────────────────────────────────── */
let currentSpec = '2019';
function showSpec(profile) {
  currentSpec = profile;
  document.querySelectorAll('.spec-btn').forEach(b => b.classList.toggle('active', b.dataset.spec === profile));
  const sc = document.getElementById('spec-canvas');
  if (sc) { HEATMAP.draw('spec-canvas', SPEC_DATA[profile]); HEATMAP.attachTooltip('spec-canvas', SPEC_DATA[profile]); }
}

/* ── PHASE BREAKDOWN TABLE ───────────────────────────────────── */
const PHASE_DATA = {
  '2019': [
    { phase: 'PRE-ELEC', days: '60', vol: '16.8%', acc: '56.2%', rdClass: '', tip: 'Pre-election jitter||Uncertainty ahead of BJP vs INC fight||VIX rose from 13 → 19 over 60-day pre-phase' },
    { phase: 'ELEC LIVE', days: '43', vol: '22.1%', acc: '68.4%', rdClass: '', tip: 'Voting phase||7-phase election, April 11 – May 19 2019||Model accuracy rises as spectrogram pattern sharpens' },
    { phase: 'RESULT DAY', days: '1', vol: '32.4%', acc: '100%', rdClass: 'result-day green', tip: 'Result day||May 23, 2019 — BJP wins 303 seats||NIFTY +3.8% intraday. Model called it: BULLISH ✓' },
    { phase: 'POST-ELEC', days: '30', vol: '18.2%', acc: '74.6%', rdClass: '', tip: 'Post-election normalisation||VIX fell from 23 → 13 within 2 weeks||Continuity premium priced in over next month' },
    { phase: 'NORMAL', days: '365+', vol: '14.6%', acc: '53.1%', rdClass: '', tip: 'Normal market||No election proximity||Model barely better than coin flip — validates election signal is real' },
  ],
  '2024': [
    { phase: 'PRE-ELEC', days: '60', vol: '18.3%', acc: '54.2%', rdClass: '', tip: 'Pre-election jitter||Exit polls overconfident in NDA supermajority||VIX stayed suppressed at 13–14, masking hidden risk' },
    { phase: 'ELEC LIVE', days: '43', vol: '24.7%', acc: '67.8%', rdClass: '', tip: 'Voting phase||7-phase election, Apr 19 – Jun 1 2024||High-freq STFT bursts detected 2 days before result day' },
    { phase: 'RESULT DAY', days: '1', vol: '41.2%', acc: '100%', rdClass: 'result-day red', tip: 'Result day||Jun 4, 2024 — NDA wins only 293 seats (hung parliament)||NIFTY −6% in 3 hours. VIX +62%. Model called it: BEARISH ✓' },
    { phase: 'POST-ELEC', days: '30', vol: '21.1%', acc: '72.4%', rdClass: '', tip: 'Post-election normalisation||Coalition government uncertainty lingered||VIX fell slowly: 26 → 15 over 3 weeks' },
    { phase: 'NORMAL', days: '365+', vol: '14.6%', acc: '53.1%', rdClass: '', tip: 'Normal market||No election proximity||Model barely better than coin flip — validates election signal is real' },
  ],
};

function renderPhaseTable(cycle) {
  const tbody = document.getElementById('phase-tbody');
  if (!tbody) return;
  tbody.innerHTML = PHASE_DATA[cycle].map(r =>
    `<tr class="${r.rdClass}" data-tip="${r.tip}">
      <td>${r.phase}</td><td>${r.days}</td><td>${r.vol}</td>
      <td style="color:${r.acc === '100%' ? (cycle === '2019' ? 'var(--green)' : 'var(--red)') : 'inherit'};font-weight:${r.acc === '100%' ? '700' : '400'}">${r.acc}</td>
    </tr>`
  ).join('');
  hookTips();
}


let betaMode = '2019';
function renderBeta(mode) {
  betaMode = mode;
  document.querySelectorAll('.beta-toggle').forEach(b => {
    b.className = 'beta-toggle ' + (b.dataset.mode === mode ? 'active-' + mode : '');
  });
  const tbody = document.getElementById('beta-tbody');
  if (!tbody) return;

  if (mode === 'cmp') {
    tbody.innerHTML = POL_BETA.sectors.map((s, i) =>
      `<tr><td>${s}</td>${['pre', 'result', 'post'].map(ph => {
        const v19 = POL_BETA['2019'][ph][i], v24 = POL_BETA['2024'][ph][i];
        return `<td><div><span class="beta-cell ${v19 >= 0 ? 'beta-pos' : 'beta-neg'}">${v19 > 0 ? '+' : ''}${v19}%</span> <small style="color:#444466">2019</small></div><div><span class="beta-cell ${v24 >= 0 ? 'beta-pos' : 'beta-neg'}">${v24 > 0 ? '+' : ''}${v24}%</span> <small style="color:#444466">2024</small></div></td>`;
      }).join('')}</tr>`
    ).join('');
    return;
  }

  const data = POL_BETA[mode];
  if (!data) return;
  tbody.innerHTML = POL_BETA.sectors.map((s, i) =>
    `<tr><td>${s}</td>${['pre', 'result', 'post'].map(ph => {
      const v = data[ph][i];
      const tip = (POL_BETA['tooltips' + mode] || {})[s + '_' + ph] || `${s}: ${v > 0 ? '+' : ''}${v}% during ${ph} in ${mode}`;
      return `<td><span class="beta-cell ${v >= 0 ? 'beta-pos' : 'beta-neg'}" data-tip="${tip}||${v > 0 ? 'Positive' : 'Negative'} reaction||Hover other cells for more">${v > 0 ? '+' : ''}${v}%</span></td>`;
    }).join('')}</tr>`
  ).join('');
  hookTips();
}

/* ── TAB SWITCHING ──────────────────────────────────────────── */
let activeCycle = '2019';
function switchCycle(cycle) {
  activeCycle = cycle;
  // Update tab button styles
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active-2019', 'active-2024');
    if (b.dataset.cycle === cycle) b.classList.add('active-' + cycle);
  });
  // Animate gauge needle
  const gm = GAUGE_MODES[cycle];
  GAUGE.setNeedle(gm.value, gm.annualVol);
  const gl = document.getElementById('gauge-label');
  if (gl) gl.textContent = gm.label;
  // Rebuild charts
  buildPriceChart(cycle);
  buildReturnBars(cycle);
  buildDonut(cycle);
  // Update feed
  buildFeed(cycle);
  // Sector deltas
  renderSectorDeltas(cycle);
  // Phase table
  renderPhaseTable(cycle);
  // Result day row colour
  const rdRow = document.getElementById('result-day-row');
  if (rdRow) { rdRow.classList.remove('red', 'green'); rdRow.classList.add(cycle === '2024' ? 'red' : 'green'); }
  // Signal
  renderSignal();
}

/* ── DEEP SCAN MODAL ─────────────────────────────────────────── */
function openDeepScan(profile) {
  const overlay = document.getElementById('deep-scan-modal');
  if (!overlay) return;
  overlay.classList.add('open');
  const titleEl = document.getElementById('ds-title');
  if (titleEl) titleEl.textContent = profile.toUpperCase() + ' PERIOD — FFT SPECTRUM';
  buildFFTModal('ds-chart', profile);
}

/* ── REPLAY ────────────────────────────────────────────────── */
let replayData = null, replayIdx = 0, replayTimer = null, replayPlaying = false;

function updateReplayCursor(idx) {
  replayIdx = idx;
  if (!replayData) return;
  const { actual, pred } = replayData;
  const a = actual[idx], p = pred[idx];
  if (a == null || p == null) return;
  const err = a - p;
  const prevA = actual[idx - 1] || a, prevP = pred[idx - 1] || p;
  const correct = Math.sign(a - prevA) === Math.sign(p - prevP);
  const card = document.getElementById('replay-card');
  if (card) {
    card.innerHTML = `<div style="color:var(--cyan);font-weight:600;margin-bottom:6px">Day ${idx + 1} of test period</div>
      Actual Nifty: <b style="color:var(--text)">₹${a.toLocaleString()}</b><br>
      Model predicted: <b style="color:var(--amber)">₹${p.toLocaleString()}</b><br>
      Error: <b style="color:${err > 0 ? 'var(--red)' : 'var(--green)'}">${err > 0 ? '+' : ''}${err.toFixed(0)} INR (${(err / a * 100).toFixed(2)}%)</b><br>
      Direction: <b style="color:${correct ? 'var(--green)' : 'var(--red)'}">${correct ? 'CORRECT ✓' : 'WRONG ✗'}</b>`;
  }
  let cc = 0;
  for (let i = 1; i <= idx; i++) {
    if (Math.sign(actual[i] - actual[i - 1]) === Math.sign(pred[i] - pred[i - 1])) cc++;
  }
  const acc = idx > 0 ? (cc / idx * 100) : 0;
  const bar = document.getElementById('accuracy-bar-fill');
  if (bar) bar.style.width = acc + '%';
  const accLabel = document.getElementById('accuracy-label');
  if (accLabel) accLabel.textContent = `Running direction accuracy: ${acc.toFixed(1)}%`;
  const scrubber = document.getElementById('replay-scrubber');
  if (scrubber) scrubber.value = idx;
}

/* ── MAIN INIT ────────────────────────────────────────────────── */
function initDashboard() {
  console.log('[ElectionSZN] initDashboard fired — Chart:', typeof Chart);

  // ── Gauge
  GAUGE.buildSVG('gauge-svg');
  GAUGE.setNeedle(72, '38.2%');
  const gl = document.getElementById('gauge-label');
  if (gl) gl.textContent = GAUGE_MODES['2019'].label;

  // ── Tab buttons
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.addEventListener('click', () => switchCycle(b.dataset.cycle));
  });

  // ── Spec toggle buttons
  document.querySelectorAll('.spec-btn').forEach(b => {
    b.addEventListener('click', () => showSpec(b.dataset.spec));
  });

  // ── Beta toggles
  document.querySelectorAll('.beta-toggle').forEach(b => {
    b.addEventListener('click', () => renderBeta(b.dataset.mode));
  });

  // ── Params collapsible
  const pt = document.getElementById('params-toggle');
  if (pt) pt.addEventListener('click', function () {
    const body = document.getElementById('params-body');
    const open = body.classList.toggle('open');
    this.querySelector('span').textContent = open ? '▲' : '▼';
  });

  // ── CNN Arch modal
  const archModal = document.getElementById('arch-modal');
  document.getElementById('arch-btn')?.addEventListener('click', () => archModal?.classList.add('open'));
  document.getElementById('arch-close')?.addEventListener('click', () => archModal?.classList.remove('open'));
  archModal?.addEventListener('click', e => { if (e.target === archModal) archModal.classList.remove('open'); });

  // ── Deep scan modal
  const dsModal = document.getElementById('deep-scan-modal');
  if (dsModal) {
    dsModal.addEventListener('click', e => { if (e.target === dsModal) dsModal.classList.remove('open'); });
  }
  const dsClose = document.getElementById('ds-close');
  if (dsClose) dsClose.addEventListener('click', () => dsModal && dsModal.classList.remove('open'));

  // ── Deep scan buttons
  ['normal', '2019', '2024'].forEach(p => {
    const card = document.getElementById(`spec-card-${p}`);
    if (!card) return;
    const btn = card.closest('.spec-card') ? card.closest('.spec-card').querySelector('.deep-scan-btn') : null;
    if (btn) btn.addEventListener('click', () => openDeepScan(p));
  });

  // ── Charts
  buildPriceChart('2019');
  buildReturnBars('2019');
  buildDonut('2019');

  // ── Match feed height to right column bottom
  function matchFeedToRightCol() {
    const rightCol = document.getElementById('right-col');
    const feedWrap = document.getElementById('feed-wrap');
    if (rightCol && feedWrap) {
      feedWrap.style.height = rightCol.offsetHeight + 'px';
    }
  }
  // Run after layout settles, and on resize
  setTimeout(matchFeedToRightCol, 300);
  window.addEventListener('resize', matchFeedToRightCol);

  // ── Feed
  buildFeed('2019');

  // ── Sector deltas
  renderSectorDeltas('2019');

  // ── Political beta
  renderBeta('2019');
  // ── Phase table
  renderPhaseTable('2019');

  // ── Hook all tooltips
  hookTips();

  // ── Replay scrubber
  const scrubber = document.getElementById('replay-scrubber');
  if (scrubber) {
    scrubber.max = 499;
    scrubber.addEventListener('input', function () { updateReplayCursor(+this.value); });
  }
  const playBtn = document.getElementById('replay-play');
  if (playBtn) playBtn.addEventListener('click', function () {
    if (replayPlaying) {
      clearInterval(replayTimer); replayPlaying = false; this.textContent = '▶ AUTO-PLAY';
    } else {
      replayPlaying = true; this.textContent = '⏹ STOP';
      if (!replayData) return;
      replayTimer = setInterval(() => {
        replayIdx = (replayIdx + 1) % replayData.actual.length;
        updateReplayCursor(replayIdx);
      }, 80);
    }
  });

  // ── Spectrograms (after layout settles)
  setTimeout(() => {
    const sc = document.getElementById('spec-canvas');
    if (sc) {
      sc.width = sc.parentElement ? sc.parentElement.offsetWidth || 700 : 700;
      HEATMAP.draw('spec-canvas', SPEC_DATA['2019']);
      HEATMAP.attachTooltip('spec-canvas', SPEC_DATA['2019']);
    }
    ['normal', '2019', '2024'].forEach(p => {
      const c = document.getElementById(`spec-card-${p}`);
      if (c) {
        c.width = c.parentElement ? c.parentElement.offsetWidth || 400 : 400;
        HEATMAP.draw(`spec-card-${p}`, SPEC_DATA[p]);
      }
    });
  }, 200);

  // ── Clock
  setInterval(updateClock, 1000);
  updateClock();

  // ── Data-driven init (replay + signal) fires when results.json loads
  window.onDataReady = () => {
    replayData = buildReplayChart();
    renderSignal();
    if (scrubber) { scrubber.max = (replayData.actual.length - 1) || 499; updateReplayCursor(0); }
  };
  // If already loaded (sync fetch fallback), trigger now
  if (PREDICTIONS.actual.length > 0) {
    replayData = buildReplayChart();
    renderSignal();
  }
}

window.addEventListener('load', initDashboard);
