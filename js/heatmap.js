/* ── CANVAS STFT SPECTROGRAM RENDERER ──────────────────── */

const HEATMAP = (() => {
    const FREQ_LABELS = ['DAILY NOISE', '', '', '', '', '', 'WEEKLY CYCLES', '', '', '', '', '', 'LONG-TERM TREND', '', '', ''];
    const TIME_LABELS = { 0: 'PRE-ELECTION', 15: 'RESULT DAY', 28: 'POST-ELECTION' };

    function valToColor(v) {
        // 0 = deep blue, 0.5 = amber, 1 = white
        if (v < 0.5) {
            const t = v * 2;
            return [
                Math.round(0 + t * 255),
                Math.round(0 + t * 115),
                Math.round(139 + t * (0 - 139)),
            ];
        } else {
            const t = (v - 0.5) * 2;
            return [
                255,
                Math.round(115 + t * (255 - 115)),
                Math.round(0 + t * 255),
            ];
        }
    }

    function draw(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const rows = data.length, cols = data[0].length;
        const PAD_L = 90, PAD_B = 28, PAD_T = 8, PAD_R = 10;
        const W = canvas.width, H = canvas.height;
        const cellW = (W - PAD_L - PAD_R) / cols;
        const cellH = (H - PAD_T - PAD_B) / rows;

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);

        // Draw cells
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const v = data[r][c];
                const [R, G, B] = valToColor(v);
                ctx.fillStyle = `rgb(${R},${G},${B})`;
                const x = PAD_L + c * cellW, y = PAD_T + r * cellH;
                ctx.fillRect(x, y, cellW + 0.5, cellH + 0.5);
            }
        }

        // Result day vertical line (col 20)
        const rdX = PAD_L + 20 * cellW;
        ctx.strokeStyle = '#ff1744';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(rdX, PAD_T); ctx.lineTo(rdX, H - PAD_B); ctx.stroke();
        ctx.setLineDash([]);

        // Freq labels (left axis)
        ctx.fillStyle = '#8888aa'; ctx.font = '8px JetBrains Mono, monospace';
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        [0, 6, 12].forEach(r => {
            if (FREQ_LABELS[r]) {
                const y = PAD_T + (r + 0.5) * cellH;
                ctx.fillText(FREQ_LABELS[r], PAD_L - 4, y);
            }
        });

        // Time labels (bottom axis)
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        Object.entries(TIME_LABELS).forEach(([c, label]) => {
            const x = PAD_L + (+c + 0.5) * cellW;
            ctx.fillStyle = +c === 15 ? '#ff1744' : '#444466';
            ctx.fillText(label, x, H - PAD_B + 4);
        });
    }

    function attachTooltip(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const rows = data.length, cols = data[0].length;
        const PAD_L = 90, PAD_B = 28, PAD_T = 8, PAD_R = 10;

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left, my = e.clientY - rect.top;
            const W = rect.width, H = rect.height;
            const cellW = (W - PAD_L - PAD_R) / cols;
            const cellH = (H - PAD_T - PAD_B) / rows;
            const c = Math.floor((mx - PAD_L) / cellW);
            const r = Math.floor((my - PAD_T) / cellH);
            if (c < 0 || c >= cols || r < 0 || r >= rows) { TOOLTIP.hide(); return; }

            const val = data[r][c];
            const energy = val < 0.25 ? 'LOW' : val < 0.5 ? 'MEDIUM' : val < 0.75 ? 'HIGH' : 'EXTREME';
            const band = r < 5 ? 'DAILY NOISE (High freq)' : r < 11 ? 'WEEKLY CYCLES (Mid freq)' : 'LONG-TERM TREND (Low freq)';
            const relTime = c < 18 ? `T${c - 20} (pre-result)` : c === 20 ? 'RESULT DAY' : `T+${c - 20} (post-result)`;
            const explain = r < 5
                ? 'High-frequency energy means rapid, erratic price swings — typical of panic selling or euphoric buying.'
                : r < 11
                    ? 'Mid-frequency energy shows weekly patterns — institutions positioning over days, not minutes.'
                    : 'Low-frequency (trend band) energy means sustained directional moves. The market chose a direction and held it.';

            TOOLTIP.show(e.clientX, e.clientY,
                `📡 Time: ${relTime}`,
                `🎵 Band: ${band} | ⚡ Energy: ${energy}`,
                explain
            );
        });
        canvas.addEventListener('mouseleave', () => TOOLTIP.hide());
    }

    return { draw, attachTooltip };
})();
