/* ── ALL CHART.JS INSTANCES ───────────────────────────── */

let priceChart = null, returnChart = null, donutChart = null, replayChart = null;

/* phase explain text for tooltips */
function phaseExplain(phase) {
    const map = {
        PRE_ELECTION: 'Market is pricing in election uncertainty. Volatility rises as institutions hedge.',
        ELECTION_LIVE: 'Votes are being cast. Major institutions reduce risk exposure ahead of result day.',
        RESULT_DAY: 'Counting underway. Every seat declared moves the market. Maximum volatility.',
        POST_ELECTION: 'New government forming. Markets pricing the policy outlook for the next 5 years.',
        NORMAL: 'Normal trading period. Market driven by earnings, macro data, and global flows.',
    };
    return map[phase] || '';
}

/* synthetic per-day data for 2019 & 2024 election windows */
const CYCLE_DATA = {
    '2019': {
        labels: Array.from({ length: 90 }, (_, i) => `D${i - 60}`),
        actual: (() => { let v = 11400; return Array.from({ length: 90 }, (_, i) => { v += (i > 58 ? 30 : i > 55 ? 20 : 5) + (Math.random() - 0.45) * 40; return +v.toFixed(1); }); })(),
        pred: null,
        phases: Array.from({ length: 90 }, (_, i) => i < 60 ? 'PRE_ELECTION' : i < 63 ? 'ELECTION_LIVE' : i === 63 ? 'RESULT_DAY' : 'POST_ELECTION'),
        resultIdx: 63, color: '#00e5ff',
    },
    '2024': {
        labels: Array.from({ length: 90 }, (_, i) => `D${i - 60}`),
        actual: (() => { let v = 22000; return Array.from({ length: 90 }, (_, i) => { const drop = i >= 62 && i <= 63 ? -220 : 0; v += drop + (i > 63 ? 10 : -2) + (Math.random() - 0.5) * 60; return +v.toFixed(1); }); })(),
        pred: null,
        phases: Array.from({ length: 90 }, (_, i) => i < 60 ? 'PRE_ELECTION' : i < 63 ? 'ELECTION_LIVE' : i === 63 ? 'RESULT_DAY' : 'POST_ELECTION'),
        resultIdx: 63, color: '#ff1744',
    },
};
['2019', '2024'].forEach(cy => {
    CYCLE_DATA[cy].pred = CYCLE_DATA[cy].actual.map(v => +(v + (Math.random() - 0.48) * v * 0.03).toFixed(1));
});

/* phase shading plugin */
const phasePlugin = {
    id: 'phasePlugin',
    afterDraw(chart) {
        const { ctx, chartArea: { left, right, top, bottom }, scales: { x } } = chart;
        const phases = chart.data._phases || [];
        const resultIdx = chart.data._resultIdx;
        const bgMap = { PRE_ELECTION: 'rgba(0,229,255,0.06)', ELECTION_LIVE: 'rgba(255,179,0,0.07)', RESULT_DAY: 'rgba(255,23,68,0.15)', POST_ELECTION: 'rgba(0,230,118,0.06)' };
        phases.forEach((ph, i) => {
            if (!bgMap[ph]) return;
            const x0 = x.getPixelForValue(i), x1 = x.getPixelForValue(i + 1);
            ctx.fillStyle = bgMap[ph];
            ctx.fillRect(x0, top, x1 - x0, bottom - top);
        });
        if (resultIdx !== undefined) {
            const rx = x.getPixelForValue(resultIdx);
            ctx.save(); ctx.strokeStyle = '#ff1744'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
            ctx.beginPath(); ctx.moveTo(rx, top); ctx.lineTo(rx, bottom); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#ff1744'; ctx.font = '9px JetBrains Mono,monospace'; ctx.textAlign = 'center';
            ctx.fillText('RESULT DAY', rx, top + 10); ctx.restore();
        }
    }
};

/* shared chart options */
const CHART_FONTS = { family: 'JetBrains Mono, monospace', size: 8 };

function buildPriceChart(cycle) {
    const d = CYCLE_DATA[cycle];
    const canvas = document.getElementById('price-chart');
    if (!canvas) return;
    if (priceChart) { try { priceChart.destroy(); } catch (e) { } priceChart = null; }
    // Set explicit pixel dimensions so Chart.js doesn't see 0
    canvas.width = Math.max(canvas.parentElement ? canvas.parentElement.clientWidth : 0, 600) || 700;
    canvas.height = 220;
    priceChart = new Chart(canvas, {
        type: 'line',
        plugins: [phasePlugin],
        data: {
            labels: d.labels, _phases: d.phases, _resultIdx: d.resultIdx, datasets: [
                { label: 'Actual', data: d.actual, borderColor: d.color, borderWidth: 1.5, pointRadius: 0, tension: 0.3, fill: false },
                { label: 'Predicted', data: d.pred, borderColor: '#ffb300', borderWidth: 1.5, borderDash: [5, 4], pointRadius: 0, tension: 0.3, fill: false },
            ]
        },
        options: {
            responsive: false,
            animation: { duration: 400 },
            plugins: {
                legend: { labels: { color: '#8888aa', font: CHART_FONTS } },
                tooltip: {
                    backgroundColor: '#0a0a0f', borderColor: '#00e5ff', borderWidth: 1,
                    titleColor: '#00e5ff', bodyColor: '#e0e0ff',
                    titleFont: { family: 'JetBrains Mono' }, bodyFont: { family: 'JetBrains Mono', size: 10 },
                    callbacks: {
                        title: items => `📅 Day ${items[0].label}`,
                        label: item => {
                            if (item.datasetIndex !== 0) return null;
                            const i = item.dataIndex, act = d.actual[i], pred = d.pred[i];
                            return [`📈 Actual: ₹${act.toLocaleString()}`, `🤖 Predicted: ₹${pred.toLocaleString()}`,
                            `📊 Error: ${(act - pred).toFixed(0)} INR`, `🗓️ Phase: ${d.phases[i]}`];
                        },
                        footer: items => `💡 ${phaseExplain(d.phases[items[0].dataIndex])}`
                    }
                }
            },
            scales: {
                x: { ticks: { color: '#444466', font: CHART_FONTS, maxTicksLimit: 10 }, grid: { color: '#1a1a2e' } },
                y: { ticks: { color: '#444466', font: CHART_FONTS }, grid: { color: '#1a1a2e' } }
            }
        }
    });
}

function buildReturnBars(cycle) {
    const d = CYCLE_DATA[cycle];
    const canvas = document.getElementById('return-chart');
    if (!canvas) return;
    if (returnChart) { try { returnChart.destroy(); } catch (e) { } returnChart = null; }
    canvas.width = Math.max(canvas.parentElement ? canvas.parentElement.clientWidth : 0, 600) || 700;
    canvas.height = 80;
    const returns = d.actual.map((v, i) => i === 0 ? 0 : +((v / d.actual[i - 1] - 1) * 100).toFixed(3));
    const colors = returns.map((r, i) => i === d.resultIdx ? (r >= 0 ? 'rgba(0,230,118,0.9)' : 'rgba(255,23,68,0.9)') : r >= 0 ? 'rgba(0,230,118,0.45)' : 'rgba(255,23,68,0.45)');
    returnChart = new Chart(canvas, {
        type: 'bar',
        data: { labels: d.labels, datasets: [{ data: returns, backgroundColor: colors, borderWidth: 0 }] },
        options: {
            responsive: false, animation: { duration: 400 },
            plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0a0a0f', borderColor: '#1a1a2e', borderWidth: 1, titleColor: '#8888aa', bodyColor: '#e0e0ff', callbacks: { title: i => `Day ${i[0].label}`, label: i => `Return: ${i.raw > 0 ? '+' : ''}${i.raw.toFixed(2)}%` } } },
            scales: { x: { display: false }, y: { ticks: { color: '#444466', font: CHART_FONTS }, grid: { color: '#1a1a2e' } } }
        }
    });
}

function buildDonut(cycle) {
    const canvas = document.getElementById('donut-chart');
    if (!canvas) return;
    if (donutChart) { try { donutChart.destroy(); } catch (e) { } donutChart = null; }
    canvas.width = 280; canvas.height = 180;
    const perf = cycle === '2024' ? SECTORS.perf2024 : SECTORS.perf2019;
    donutChart = new Chart(canvas, {
        type: 'doughnut',
        data: { labels: SECTORS.labels, datasets: [{ data: SECTORS.weights, backgroundColor: SECTORS.colors, borderColor: '#050505', borderWidth: 2 }] },
        options: {
            responsive: false, cutout: '55%', animation: { duration: 400 },
            plugins: {
                legend: { position: 'right', labels: { color: '#8888aa', font: { family: 'JetBrains Mono', size: 8 }, boxWidth: 8, padding: 4 } },
                tooltip: {
                    backgroundColor: '#0a0a0f', borderColor: '#1a1a2e', borderWidth: 1, titleColor: '#00e5ff', bodyColor: '#e0e0ff',
                    callbacks: { title: i => i[0].label, label: i => `Weight: ${i.raw}% | ${cycle}: ${perf[i.dataIndex] > 0 ? '+' : ''}${perf[i.dataIndex]}%` }
                }
            }
        }
    });
}

function buildReplayChart() {
    const canvas = document.getElementById('replay-chart');
    if (!canvas) return null;
    if (replayChart) { try { replayChart.destroy(); } catch (e) { } replayChart = null; }
    canvas.width = Math.max(canvas.parentElement ? canvas.parentElement.clientWidth : 0, 800) || 1100;
    canvas.height = 280;
    const actual = PREDICTIONS.actual.slice(0, 500);
    const pred = (PREDICTIONS.predicted || []).slice(0, 500);
    const safePred = pred.length >= actual.length ? pred : actual.map(v => +(v + (Math.random() - 0.5) * 500).toFixed(1));
    const labels = actual.map((_, i) => `Day ${i + 1}`);
    replayChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels, datasets: [
                { label: 'Actual', data: actual, borderColor: '#00e5ff', borderWidth: 1.2, pointRadius: 0, tension: 0.2, fill: false },
                { label: 'Predicted', data: safePred, borderColor: '#ffb300', borderWidth: 1.2, pointRadius: 0, tension: 0.2, fill: false, borderDash: [4, 3] },
            ]
        },
        options: {
            responsive: false, animation: { duration: 0 },
            plugins: {
                legend: { labels: { color: '#8888aa', font: { family: 'JetBrains Mono', size: 10 } } },
                tooltip: { backgroundColor: '#0a0a0f', borderColor: '#00e5ff', borderWidth: 1, titleColor: '#00e5ff', bodyColor: '#e0e0ff' }
            },
            scales: {
                x: { ticks: { color: '#444466', font: CHART_FONTS, maxTicksLimit: 12 }, grid: { color: '#1a1a2e' } },
                y: { ticks: { color: '#444466', font: CHART_FONTS }, grid: { color: '#1a1a2e' } }
            }
        }
    });
    return { actual, pred: safePred, labels };
}

function buildFFTModal(canvasId, profile) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    canvas.width = 560; canvas.height = 280;
    const bands = ['0–0.017', '0.017–0.05', '0.05–0.1', '0.1–0.25', '0.25–0.5', '0.5–1.0', '1.0–2.0', '2.0–3.0'];
    const normalAmp = [0.85, 0.72, 0.60, 0.45, 0.30, 0.18, 0.12, 0.08];
    const elec19Amp = [0.95, 0.88, 0.75, 0.60, 0.42, 0.28, 0.20, 0.14];
    const elec24Amp = [0.60, 0.65, 0.70, 0.78, 0.72, 0.65, 0.58, 0.45];
    const ampMap = { normal: normalAmp, '2019': elec19Amp, '2024': elec24Amp };
    const colMap = { normal: '#00e5ff', '2019': '#00e676', '2024': '#ff1744' };
    try {
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: bands, datasets: [
                    { label: 'NORMAL', data: normalAmp, backgroundColor: 'rgba(0,229,255,0.25)', borderColor: '#00e5ff', borderWidth: 1 },
                    profile !== 'normal' ? { label: profile + ' ELECTION', data: ampMap[profile], backgroundColor: profile === '2019' ? 'rgba(0,230,118,0.35)' : 'rgba(255,23,68,0.35)', borderColor: colMap[profile], borderWidth: 1 } : { label: '', data: [], hidden: true },
                ]
            },
            options: {
                responsive: false,
                plugins: { legend: { labels: { color: '#8888aa', font: { family: 'JetBrains Mono', size: 9 } } } },
                scales: {
                    x: { title: { display: true, text: 'FREQUENCY BAND', color: '#444466', font: { family: 'JetBrains Mono', size: 8 } }, ticks: { color: '#444466', font: { family: 'JetBrains Mono', size: 7 } }, grid: { color: '#1a1a2e' } },
                    y: { title: { display: true, text: 'NORMALISED AMPLITUDE', color: '#444466', font: { family: 'JetBrains Mono', size: 8 } }, ticks: { color: '#444466', font: { family: 'JetBrains Mono', size: 8 } }, grid: { color: '#1a1a2e' } }
                }
            }
        });
    } catch (e) { console.error('FFT modal chart:', e); }
}
