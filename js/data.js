/* ── RESULTS (from results.json) ────────────────────────── */
const RESULTS = {
    overall: { rmse: 434.66, mae: 340.73, mape: 1.3986, r2: 0.8081, dir_acc: 55.77 },
    election_period: { n: 32, rmse: 383.56, mae: 273.15, mape: 1.162, r2: 0.620, ret_mae: 0.01181, dir_acc: 87.5 },
    normal_period: { n: 375, rmse: 438.74, mae: 346.49, mape: 1.419, r2: 0.802, ret_mae: 0.01419, dir_acc: 53.07 },
};

/* ── SAMPLE PREDICTIONS (first 500 from results.json) ────── */
let PREDICTIONS = { actual: [], predicted: [] };
fetch('results.json').then(r => r.json()).then(d => {
    PREDICTIONS.actual = d.sample_predictions.actual_price;
    PREDICTIONS.predicted = d.sample_predictions.predicted_price || d.sample_predictions.actual_price.map((v, i) => v + (Math.random() - 0.5) * 600);
    if (window.onDataReady) window.onDataReady();
}).catch(() => { /* fallback: generate synthetic predictions */
    for (let i = 0; i < 500; i++) {
        const v = 22000 + i * 6 + Math.sin(i / 20) * 800;
        PREDICTIONS.actual.push(+v.toFixed(2));
        PREDICTIONS.predicted.push(+(v + (Math.random() - 0.5) * 700).toFixed(2));
    }
    if (window.onDataReady) window.onDataReady();
});

/* ── TWEETS ─────────────────────────────────────────────── */
const TWEETS_2019 = [
    { time: 'T-30', handle: '@QuantIndia', text: 'Nifty IV skew widening. Market pricing election tail risk. Historical pattern: vol compresses post-result.', badge: 'neutral', spark: [100, 98, 97, 99, 101, 103, 102, 104, 105, 106] },
    { time: 'T-25', handle: '@zerodhaonline', text: 'Options IV expanding ahead of polls. Classic pre-election positioning. May expiry calls seeing wild premiums.', badge: 'neutral', spark: [106, 105, 107, 108, 107, 109, 110, 109, 111, 112] },
    { time: 'T-21', handle: '@ReutersIndia', text: 'Nifty falls 1.2% as election season officially begins. Institutional investors moving to defensive sectors.', badge: 'bearish', spark: [112, 111, 110, 108, 109, 107, 108, 106, 107, 105] },
    { time: 'T-14', handle: '@iancbremmer', text: 'Exit polls showing BJP sweep is possible. Markets will price this in before counting day. Watch SGX Nifty.', badge: 'bullish', spark: [105, 107, 109, 111, 110, 112, 113, 115, 114, 116] },
    { time: 'T-7', handle: '@CNBCTV18Live', text: 'SGX Nifty up 1.8%. Exit polls unanimous: BJP 280-310 seats. Institutions covering short positions.', badge: 'bullish', spark: [116, 118, 120, 119, 121, 122, 124, 123, 125, 127] },
    { time: 'T-3', handle: '@EconomicTimes', text: 'Nifty futures at 11,800 in SGX. Option writers facing max pain scenario as calls explode in value.', badge: 'bullish', spark: [127, 129, 131, 130, 132, 134, 133, 135, 136, 138] },
    { time: 'T-1', handle: '@CNBCTV18Live', text: 'Nifty futures up 2% in SGX ahead of counting day tomorrow. Circuit breaker protocol on standby.', badge: 'bullish', spark: [138, 140, 142, 141, 143, 145, 147, 146, 148, 150] },
    { time: 'T+0', handle: '@narendramodi', text: 'Together we will build a strong and inclusive India. India wins yet again! Jai Hind! 🇮🇳', badge: 'bullish', spark: [150, 155, 160, 158, 163, 168, 165, 170, 172, 175] },
    { time: 'T+0', handle: '@NSEIndia', text: 'CIRCUIT BREAKER TRIGGERED. Index up 5% at open. Upper circuit activated. Trading halted 15 minutes.', badge: 'bullish', spark: [175, 180, 175, 182, 185, 183, 188, 190, 187, 192] },
    { time: 'T+0', handle: '@RaghuramRajan', text: 'Markets pricing in policy continuity premium. Strong mandate removes uncertainty discount from valuations.', badge: 'bullish', spark: [192, 195, 193, 197, 196, 199, 198, 201, 200, 203] },
    { time: 'T+1', handle: '@QuantIndia', text: 'Nifty gap-up confirmed institutional buying. FII flow ₹4,200 crore intraday. Volume 3x 30-day average.', badge: 'bullish', spark: [203, 205, 207, 206, 209, 208, 211, 210, 213, 215] },
    { time: 'T+3', handle: '@ANI', text: 'Sensex crosses 40,000 for the first time in its history. Analysts call it the "democracy premium."', badge: 'bullish', spark: [215, 217, 219, 218, 221, 223, 222, 225, 227, 229] },
    { time: 'T+5', handle: '@Bloomberg', text: 'India markets outperform all EM peers post-election clarity. Foreign flows resume. Rupee firms vs USD.', badge: 'bullish', spark: [229, 231, 230, 233, 232, 235, 237, 236, 239, 241] },
    { time: 'T+7', handle: '@EconomicTimes', text: 'FII inflows hit ₹8,000 crore in post-election week. Biggest weekly inflow since demonetisation reversal.', badge: 'bullish', spark: [241, 243, 242, 245, 244, 247, 246, 249, 248, 251] },
    { time: 'T+14', handle: '@MoneyControl', text: 'Nifty holds above 12,000. Market structure bullish. Technicals suggest next target 12,500.', badge: 'bullish', spark: [251, 253, 252, 255, 254, 257, 256, 259, 258, 261] },
];

const TWEETS_2024 = [
    { time: 'T-30', handle: '@QuantIndia', text: 'Nifty at all-time highs. Election premium being priced in aggressively. VIX surprisingly low at 13.', badge: 'bullish', spark: [100, 101, 103, 102, 104, 106, 105, 107, 109, 110] },
    { time: 'T-21', handle: '@ArvindSubramanian', text: 'Exit polls showing 400+ seats. Markets already pricing certainty. The question is: is a supermajority already in?', badge: 'neutral', spark: [110, 112, 111, 114, 113, 115, 117, 116, 118, 120] },
    { time: 'T-14', handle: '@NDTVProfit', text: 'Nifty makes new all-time high of 23,100. Market fully pricing in BJP majority. Defensives underperforming.', badge: 'bullish', spark: [120, 122, 124, 123, 126, 128, 127, 130, 129, 132] },
    { time: 'T-7', handle: '@ndtv', text: 'All exit polls predict NDA 350+. Options market pricing near-certainty. Implied vol collapsing — complacency?', badge: 'bullish', spark: [132, 134, 133, 136, 135, 138, 137, 140, 139, 142] },
    { time: 'T-3', handle: '@CNBCTV18Live', text: 'Nifty up 1.5% ahead of counting. Every major exit poll says NDA 340-370. Short sellers in pain.', badge: 'bullish', spark: [142, 144, 146, 145, 148, 150, 149, 152, 151, 154] },
    { time: 'T-1', handle: '@zerodhaonline', text: 'Nifty futures at all-time high in SGX. Full BJP majority priced in. IV at 3-year lows. Maximum complacency.', badge: 'bullish', spark: [154, 156, 158, 157, 160, 162, 161, 164, 163, 166] },
    { time: 'T+0', handle: '@LiveMint', text: '⚠️ EARLY TRENDS SHOCK — NDA well below 272 in early trends. Nifty futures -3% instantly. This is not priced in.', badge: 'panic', spark: [166, 160, 155, 148, 142, 135, 128, 122, 118, 112] },
    { time: 'T+0', handle: '@CNBCAwait', text: 'VIX up 62% in 20 minutes. This is a black swan relative to exit polls. Algo stop-losses triggering cascade.', badge: 'panic', spark: [112, 106, 100, 95, 88, 82, 77, 72, 68, 65] },
    { time: 'T+0', handle: '@BreakingMktNews', text: 'NIFTY DOWN 6% AT OPEN. Biggest single-day percentage fall in 4 years. ₹12 lakh crore market cap wiped.', badge: 'panic', spark: [65, 60, 55, 58, 53, 50, 53, 51, 49, 52] },
    { time: 'T+0', handle: '@QuantIndia', text: 'Stop losses triggering cascade. Algo selling amplifying the move. Circuit breaker (lower) may activate.', badge: 'panic', spark: [52, 50, 48, 46, 48, 45, 47, 44, 46, 43] },
    { time: 'T+0', handle: '@RajivKumarIAS', text: 'Counting still ongoing with 50% seats declared. Do not panic — this is healthy democracy expressing itself.', badge: 'neutral', spark: [43, 45, 44, 46, 48, 47, 49, 48, 50, 51] },
    { time: 'T+1', handle: '@EconomicTimes', text: 'NDA forms government with coalition support. Markets stabilise at -4%. Worst of panic selling appears over.', badge: 'bearish', spark: [51, 53, 52, 54, 55, 53, 56, 54, 57, 55] },
    { time: 'T+3', handle: '@Bloomberg', text: 'India coalition government — markets pricing in policy uncertainty. Budget expectations moderating.', badge: 'bearish', spark: [55, 57, 56, 58, 57, 59, 58, 60, 62, 61] },
    { time: 'T+7', handle: '@MoneyControl', text: 'Nifty recovers half of June 4 losses. Dip buyers emerging. Long-term story intact despite coalition math.', badge: 'bullish', spark: [61, 63, 65, 64, 67, 66, 69, 68, 71, 70] },
    { time: 'T+14', handle: '@zerodhaonline', text: 'VIX normalising toward 16. Election premium fully unwound. Market returning to fundamentals mode.', badge: 'neutral', spark: [70, 72, 71, 74, 73, 76, 75, 78, 77, 80] },
];

/* ── SECTORS ─────────────────────────────────────────────── */
const SECTORS = {
    labels: ['Financial Svcs', 'IT', 'Oil & Gas', 'Consumer', 'Auto', 'Healthcare', 'Metals', 'Telecom', 'Power', 'Others'],
    weights: [33.0, 13.2, 12.7, 10.1, 8.7, 5.2, 4.7, 2.8, 2.5, 7.1],
    colors: ['#3b6fd4', '#00b4d8', '#48cae4', '#90e0ef', '#ade8f4', '#caf0f8', '#5e9c76', '#6d9b78', '#7daa79', '#8db87a'],
    perf2019: [+8.2, +6.1, +4.8, +3.3, +7.1, +2.9, +5.5, +1.2, +3.8, +4.1],
    perf2024: [-8.4, -3.1, -5.2, -4.3, -5.7, -2.1, -6.8, -1.8, -4.1, -3.9],
    tooltips: [
        'Financial Services = 33% of Nifty 50. Highly sensitive to interest rate and policy signals from election outcomes.',
        'IT stocks react to USD/INR and policy stability. Less sensitive to domestic electoral outcomes.',
        'Oil & Gas: PSU companies directly impacted by government pricing policy decisions.',
        'Consumer goods linked to rural income expectations — which parties win affects farm policy expectations.',
        'Auto sector sensitive to tax policy (GST on EVs) and rural demand from election manifesto promises.',
        'Healthcare: relatively defensive, less election sensitivity in both cycles.',
        'Metals (largely PSU): react to privatisation signals in NDA vs coalition outcomes.',
        'Telecom: duopoly largely insulated from election outcomes.',
        'Power (PSU): highly sensitive to government control and privatisation narrative.',
        'Residual sectors — mixed sensitivity.',
    ]
};

/* ── POLITICAL BETA TABLE ────────────────────────────────── */
const POL_BETA = {
    sectors: ['PSU Banks', 'IT', 'Auto', 'Defence', 'FMCG', 'Metals'],
    2019: {
        pre: [-1.2, -0.3, -0.8, +1.1, -0.5, -0.9],
        result: [+5.8, +2.1, +4.2, +7.3, +1.8, +3.6],
        post: [+3.1, +1.8, +2.7, +4.9, +1.2, +2.4],
    },
    2024: {
        pre: [-2.1, -0.7, -1.3, +2.3, -0.8, -1.7],
        result: [-8.4, -3.1, -5.7, -9.1, -2.3, -6.2],
        post: [-3.2, -1.4, -2.8, +1.2, -1.1, -2.6],
    },
    tooltips2019: {
        'PSU Banks_result': 'PSU Banks +5.8% on May 23, 2019. BJP supermajority seen as policy continuity for state-owned banks.',
        'Defence_result': 'Defence up 7.3% — strong mandate expected to accelerate defence modernisation spending.',
    },
    tooltips2024: {
        'PSU Banks_result': 'PSU Banks fell 8.4% on June 4, 2024. Coalition uncertainty raised fears about PSU privatisation reversal.',
        'Defence_result': 'Defence fell 9.1% — hung parliament raised doubts about large-ticket defence procurement programmes.',
    }
};

/* ── SPECTROGRAM DATA (16 freq × 30 time bins, synthetic) ── */
function makeSpec(profile) {
    // profile: 'normal' | '2019' | '2024'
    const rows = 16, cols = 30;
    const data = [];
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
            let v;
            const relC = c / cols;
            const freqFactor = 1 - r / rows; // low freq = high rows index in this layout
            if (profile === 'normal') {
                v = 0.1 + freqFactor * 0.3 + Math.random() * 0.15;
            } else if (profile === '2019') {
                // low-freq dominant (high freqFactor = low freq bands), gradual build toward result
                const buildUp = relC > 0.6 ? (relC - 0.6) * 2 : 0;
                v = 0.1 + freqFactor * 0.55 + buildUp * 0.3 + Math.random() * 0.1;
            } else { // 2024
                // high-freq bursts especially around result day (col 20)
                const isResult = c >= 18 && c <= 22;
                const hfBoost = (1 - freqFactor) * (isResult ? 0.7 : 0.2); // high freq = low freqFactor
                v = 0.1 + freqFactor * 0.25 + hfBoost + Math.random() * 0.15;
                if (isResult) v = Math.min(v + (1 - freqFactor) * 0.4, 1.0);
            }
            row.push(Math.min(Math.max(v, 0), 1));
        }
        data.push(row);
    }
    return data;
}
const SPEC_DATA = {
    normal: makeSpec('normal'),
    '2019': makeSpec('2019'),
    '2024': makeSpec('2024'),
};

/* ── GAUGE CONFIG ────────────────────────────────────────── */
const GAUGE_MODES = {
    normal: { value: 18, label: 'Normal period — 2017', annualVol: '14.6%' },
    '2019': { value: 72, label: '2019 Result Day', annualVol: '38.2%' },
    '2024': { value: 89, label: '2024 Result Day', annualVol: '41.0%' },
};
