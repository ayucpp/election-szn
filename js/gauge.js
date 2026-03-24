/* ── SVG VOLATILITY DOOMSDAY CLOCK ─────────────────────── */

const GAUGE = (() => {
    const W = 360, H = 240, CX = 180, CY = 200, R = 170, STROKE = 28;
    const START_ANG = Math.PI, SWEEP = Math.PI; // 180° arc, left to right

    const SEGS = [
        { from: 0, to: 25, color: '#00e676', label: 'QUIET MARKET' },
        { from: 25, to: 50, color: '#ffb300', label: 'ELECTION JITTERS' },
        { from: 50, to: 75, color: '#ff6d00', label: 'SOMETHING IS HAPPENING' },
        { from: 75, to: 100, color: '#ff1744', label: 'RESULT DAY CHAOS' },
    ];

    function valToAngle(val) {
        return START_ANG + (val / 100) * SWEEP;
    }

    function polarToXY(angle, radius) {
        return { x: CX + radius * Math.cos(angle), y: CY + radius * Math.sin(angle) };
    }

    function arcPath(aStart, aEnd, r) {
        const s = polarToXY(aStart, r), e = polarToXY(aEnd, r);
        const la = (aEnd - aStart) > Math.PI ? 1 : 0;
        return `M ${s.x} ${s.y} A ${r} ${r} 0 ${la} 1 ${e.x} ${e.y}`;
    }

    function buildSVG(containerId) {
        const svg = document.getElementById(containerId);
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

        // Background arc
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        bg.setAttribute('d', arcPath(START_ANG, START_ANG + SWEEP, R));
        bg.setAttribute('stroke', '#1a1a2e');
        bg.setAttribute('stroke-width', STROKE + 4);
        bg.setAttribute('fill', 'none');
        bg.setAttribute('stroke-linecap', 'round');
        svg.appendChild(bg);

        // Coloured segments
        SEGS.forEach(seg => {
            const a1 = valToAngle(seg.from), a2 = valToAngle(seg.to);
            const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            el.setAttribute('d', arcPath(a1, a2, R));
            el.setAttribute('stroke', seg.color);
            el.setAttribute('stroke-width', STROKE);
            el.setAttribute('fill', 'none');
            el.setAttribute('opacity', '0.35');
            svg.appendChild(el);
        });

        // Tick marks
        [0, 25, 50, 75, 100].forEach(v => {
            const a = valToAngle(v);
            const inner = polarToXY(a, R - STROKE);
            const outer = polarToXY(a, R + STROKE * 0.3);
            const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            ln.setAttribute('x1', inner.x); ln.setAttribute('y1', inner.y);
            ln.setAttribute('x2', outer.x); ln.setAttribute('y2', outer.y);
            ln.setAttribute('stroke', '#444466'); ln.setAttribute('stroke-width', '1.5');
            svg.appendChild(ln);
        });

        // Needle group
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('id', 'gauge-needle-g');
        const needle = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        needle.setAttribute('id', 'gauge-needle');
        needle.setAttribute('x1', CX); needle.setAttribute('y1', CY);
        needle.setAttribute('stroke', '#e0e0ff'); needle.setAttribute('stroke-width', '3');
        needle.setAttribute('stroke-linecap', 'round');
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', CX); dot.setAttribute('cy', CY); dot.setAttribute('r', '8');
        dot.setAttribute('fill', '#e0e0ff');
        g.appendChild(needle); g.appendChild(dot);
        svg.appendChild(g);

        // Centre value text
        const valText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        valText.setAttribute('id', 'gauge-val-text');
        valText.setAttribute('x', CX); valText.setAttribute('y', CY - 30);
        valText.setAttribute('text-anchor', 'middle'); valText.setAttribute('font-family', 'JetBrains Mono, monospace');
        valText.setAttribute('font-size', '28'); valText.setAttribute('font-weight', '700');
        valText.setAttribute('fill', '#e0e0ff');
        svg.appendChild(valText);

        const subText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        subText.setAttribute('id', 'gauge-sub-text');
        subText.setAttribute('x', CX); subText.setAttribute('y', CY - 8);
        subText.setAttribute('text-anchor', 'middle'); subText.setAttribute('font-family', 'JetBrains Mono, monospace');
        subText.setAttribute('font-size', '9'); subText.setAttribute('fill', '#8888aa'); subText.setAttribute('letter-spacing', '2');
        svg.appendChild(subText);

        // Segment labels
        SEGS.forEach((seg, i) => {
            const midVal = (seg.from + seg.to) / 2;
            const a = valToAngle(midVal);
            const pos = polarToXY(a, R - STROKE * 2.2);
            const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            t.setAttribute('x', pos.x); t.setAttribute('y', pos.y);
            t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-family', 'JetBrains Mono, monospace');
            t.setAttribute('font-size', '7.5'); t.setAttribute('fill', seg.color); t.setAttribute('font-weight', '600');
            t.setAttribute('letter-spacing', '0.5');
            seg.label.split(' ').forEach((word, wi) => {
                const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                tspan.setAttribute('x', pos.x); tspan.setAttribute('dy', wi === 0 ? '-0.5em' : '1.1em');
                tspan.textContent = word;
                t.appendChild(tspan);
            });
            svg.appendChild(t);
        });
    }

    function setNeedle(value, annualVol) {
        const ang = valToAngle(Math.max(0, Math.min(100, value)));
        const tip = polarToXY(ang, R - STROKE * 0.5);
        const needle = document.getElementById('gauge-needle');
        if (!needle) return;
        needle.setAttribute('x2', tip.x);
        needle.setAttribute('y2', tip.y);

        // Colour needle based on zone
        const zone = SEGS.find(s => value >= s.from && value <= s.to) || SEGS[3];
        needle.setAttribute('stroke', zone.color);
        document.getElementById('gauge-needle-g').querySelector('circle').setAttribute('fill', zone.color);

        const valText = document.getElementById('gauge-val-text');
        if (valText) { valText.textContent = annualVol; valText.setAttribute('fill', zone.color); }
        const subText = document.getElementById('gauge-sub-text');
        if (subText) subText.textContent = 'ANNUALISED VOL';
    }

    return { buildSVG, setNeedle };
})();
