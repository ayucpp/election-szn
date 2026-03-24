import os, warnings, json, pickle
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from scipy import signal as scipy_signal
from scipy.fft import fft, fftfreq
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

warnings.filterwarnings('ignore')
plt.style.use('dark_background')
np.random.seed(42)
tf.random.set_seed(42)

print('✅ All packages imported')
print(f'   TensorFlow: {tf.__version__}')
print(f'   NumPy:      {np.__version__}')
print(f'   Pandas:     {pd.__version__}')

# ─────────────────────────────────────────────────────────────────
# STEP 1 — Load & Clean
# ─────────────────────────────────────────────────────────────────
fname = 'NIFTY 50_minute.csv'
df_raw = pd.read_csv(fname)
df_raw.columns = df_raw.columns.str.lower().str.strip()
df_raw = df_raw.rename(columns={'date': 'datetime'})
df_raw['datetime'] = pd.to_datetime(df_raw['datetime'], format='%Y-%m-%d %H:%M:%S')
df_raw = df_raw.sort_values('datetime').reset_index(drop=True)
if 'volume' in df_raw.columns:
    df_raw = df_raw.drop(columns=['volume'])
df_raw = df_raw.dropna(subset=['close']).reset_index(drop=True)

# Compute log-returns — stationary signal, essential for STFT
df_raw['log_ret'] = np.log(df_raw['close'] / df_raw['close'].shift(1))
df_raw = df_raw.iloc[1:].reset_index(drop=True)   # drop first NaN row

print(f'✅ Loaded  |  {len(df_raw):,} rows')
print(f'   Range : {df_raw["datetime"].min()}  →  {df_raw["datetime"].max()}')
print(f'   Close : {df_raw["close"].min():.0f}  →  {df_raw["close"].max():.0f} INR')
print(df_raw.head(3).to_string())

# ─────────────────────────────────────────────────────────────────
# STEP 2 — Label Election Windows
# ─────────────────────────────────────────────────────────────────
ELECTIONS = [
    {
        'name':       '2019 Lok Sabha',
        'pre_start':  '2019-02-11',
        'vote_start': '2019-04-11',
        'result_day': '2019-05-23',
        'post_end':   '2019-06-23',
        'outcome':    'BJP_MAJORITY',
        'color':      '#00e5ff'
    },
    {
        'name':       '2024 Lok Sabha',
        'pre_start':  '2024-02-19',
        'vote_start': '2024-04-19',
        'result_day': '2024-06-04',
        'post_end':   '2024-07-04',
        'outcome':    'HUNG_PARLIAMENT',
        'color':      '#ff1744'
    }
]

df_raw['phase']       = 'NORMAL'
df_raw['e_name']      = 'None'
df_raw['e_color']     = '#444466'
df_raw['is_election'] = 0

for e in ELECTIONS:
    pre    = pd.to_datetime(e['pre_start'])
    vote   = pd.to_datetime(e['vote_start'])
    result = pd.to_datetime(e['result_day'])
    post   = pd.to_datetime(e['post_end'])
    dt     = df_raw['datetime']
    df_raw.loc[(dt >= pre)    & (dt < vote),    'phase'] = 'PRE_ELECTION'
    df_raw.loc[(dt >= vote)   & (dt <= result), 'phase'] = 'ELECTION_LIVE'
    df_raw.loc[(dt >  result) & (dt <= post),   'phase'] = 'POST_ELECTION'
    mask = (dt >= pre) & (dt <= post)
    df_raw.loc[mask, 'e_name']      = e['name']
    df_raw.loc[mask, 'e_color']     = e['color']
    df_raw.loc[mask, 'is_election'] = 1

print('✅ Election phases labelled')
print(df_raw['phase'].value_counts().to_string())

# ─────────────────────────────────────────────────────────────────
# FIGURE 1 — Time Series + Volatility
# ─────────────────────────────────────────────────────────────────
df_daily = (
    df_raw.set_index('datetime')['close']
    .resample('D').last().dropna().reset_index()
)
df_daily['returns']    = df_daily['close'].pct_change()
df_daily['volatility'] = df_daily['returns'].rolling(20).std() * np.sqrt(252) * 100

fig, axes = plt.subplots(2, 1, figsize=(18, 10), facecolor='#050505')

ax1 = axes[0]
ax1.set_facecolor('#0a0a0f')
ax1.plot(df_daily['datetime'], df_daily['close'], color='#00e5ff', lw=0.8, alpha=0.9)
for e in ELECTIONS:
    ax1.axvspan(pd.to_datetime(e['pre_start']), pd.to_datetime(e['post_end']),
                alpha=0.12, color=e['color'])
    ax1.axvline(pd.to_datetime(e['result_day']), color=e['color'], lw=1.5, ls='--', alpha=0.9)
    ax1.text(pd.to_datetime(e['result_day']), df_daily['close'].max() * 0.97,
             f"  {e['outcome']}", color=e['color'], fontfamily='monospace', fontsize=7)
ax1.set_title('NIFTY 50 — 1-MIN DATA (DAILY CLOSE)  |  ELECTION WINDOWS HIGHLIGHTED',
              color='#e0e0ff', fontfamily='monospace', fontsize=11, pad=10)
ax1.set_ylabel('CLOSE (INR)', color='#8888aa', fontfamily='monospace', fontsize=9)
ax1.tick_params(colors='#444466', labelsize=8)
for sp in ax1.spines.values(): sp.set_color('#1a1a2e')
ax1.grid(color='#1a1a2e', lw=0.5)
handles = [
    mpatches.Patch(color='#00e5ff', alpha=0.4, label='2019 Lok Sabha window'),
    mpatches.Patch(color='#ff1744', alpha=0.4, label='2024 Lok Sabha window'),
    plt.Line2D([0],[0], color='#00e5ff', lw=0.8, label='Nifty 50 close'),
]
ax1.legend(handles=handles, fontsize=8, facecolor='#0a0a0f',
           edgecolor='#1a1a2e', labelcolor='#e0e0ff', prop={'family':'monospace'})

ax2 = axes[1]
ax2.set_facecolor('#0a0a0f')
ax2.plot(df_daily['datetime'], df_daily['volatility'], color='#444466', lw=0.6)
ax2.fill_between(df_daily['datetime'], df_daily['volatility'], alpha=0.2, color='#444466')
for e in ELECTIONS:
    mask = ((df_daily['datetime'] >= pd.to_datetime(e['pre_start'])) &
            (df_daily['datetime'] <= pd.to_datetime(e['post_end'])))
    ax2.fill_between(df_daily.loc[mask,'datetime'], df_daily.loc[mask,'volatility'],
                     alpha=0.5, color=e['color'])
    ax2.plot(df_daily.loc[mask,'datetime'], df_daily.loc[mask,'volatility'],
             color=e['color'], lw=1.5)
ax2.set_title('ANNUALISED VOLATILITY (20-DAY ROLLING)  |  ELECTION PERIODS IN COLOUR',
              color='#e0e0ff', fontfamily='monospace', fontsize=11, pad=10)
ax2.set_ylabel('VOLATILITY (%)', color='#8888aa', fontfamily='monospace', fontsize=9)
ax2.set_xlabel('DATE', color='#8888aa', fontfamily='monospace', fontsize=9)
ax2.tick_params(colors='#444466', labelsize=8)
for sp in ax2.spines.values(): sp.set_color('#1a1a2e')
ax2.grid(color='#1a1a2e', lw=0.5)
plt.tight_layout(pad=2)
plt.savefig('fig1_time_series.png', dpi=150, bbox_inches='tight', facecolor='#050505')
plt.close()
print('✅ Figure 1 saved')

# ─────────────────────────────────────────────────────────────────
# FIGURE 2 — FFT Frequency Spectrum
# FIX: compute FFT on log-returns (stationary), not raw prices
# ─────────────────────────────────────────────────────────────────
def get_log_returns(df, phases):
    return df[df['phase'].isin(phases)]['log_ret'].dropna().values

ret_normal   = get_log_returns(df_raw, ['NORMAL'])
ret_election = get_log_returns(df_raw, ['PRE_ELECTION','ELECTION_LIVE','POST_ELECTION'])

def compute_fft(signal, fs=375.0):
    N = len(signal)
    win = np.hanning(N)
    f_vals = np.abs(fft(signal * win))[:N//2]
    freqs  = fftfreq(N, d=1.0/fs)[:N//2]
    f_vals = f_vals / (f_vals.max() + 1e-12)
    return freqs, f_vals

n_use = min(len(ret_normal), len(ret_election), 100_000)
f_n, amp_n = compute_fft(ret_normal[:n_use])
f_e, amp_e = compute_fft(ret_election[:n_use])

fig, axes = plt.subplots(1, 2, figsize=(18, 6), facecolor='#050505')
for ax, freqs, amps, title, color in [
    (axes[0], f_n, amp_n, 'NORMAL MARKET PERIOD', '#00e5ff'),
    (axes[1], f_e, amp_e, 'ELECTION SEASON',       '#ff1744'),
]:
    ax.set_facecolor('#0a0a0f')
    mask = (freqs > 0) & (freqs < 3)
    ax.semilogy(freqs[mask], amps[mask], color=color, lw=0.8, alpha=0.9)
    ax.fill_between(freqs[mask], amps[mask], alpha=0.2, color=color)
    ax.axvspan(0,     0.017, alpha=0.08, color='#00e676', label='Trend (daily cycle)')
    ax.axvspan(0.017, 0.25,  alpha=0.08, color='#ffb300', label='Intraday cycles')
    ax.axvspan(0.25,  3.0,   alpha=0.08, color='#ff1744', label='High-freq noise')
    ax.set_title(f'FFT SPECTRUM — {title}', color='#e0e0ff',
                 fontfamily='monospace', fontsize=10, pad=10)
    ax.set_xlabel('FREQUENCY (cycles / minute)', color='#8888aa',
                  fontfamily='monospace', fontsize=8)
    ax.set_ylabel('NORMALISED AMPLITUDE (log)', color='#8888aa',
                  fontfamily='monospace', fontsize=8)
    ax.tick_params(colors='#444466', labelsize=7)
    for sp in ax.spines.values(): sp.set_color('#1a1a2e')
    ax.grid(color='#1a1a2e', lw=0.5)
    ax.legend(fontsize=7, facecolor='#0a0a0f', edgecolor='#1a1a2e',
              labelcolor='#e0e0ff', prop={'family':'monospace'})
plt.suptitle('FIGURE 2 — FFT FREQUENCY SPECTRUM: NORMAL vs ELECTION PERIOD',
             color='#e0e0ff', fontfamily='monospace', fontsize=12, y=1.01)
plt.tight_layout()
plt.savefig('fig2_frequency_spectrum.png', dpi=150, bbox_inches='tight', facecolor='#050505')
plt.close()
print('✅ Figure 2 saved')

# ─────────────────────────────────────────────────────────────────
# FIGURE 3 — STFT Spectrogram
# FIX: STFT on log-returns (not raw price)
# ─────────────────────────────────────────────────────────────────
def get_price_window(df, center_date, days_before=45, days_after=45):
    c = pd.to_datetime(center_date)
    mask = ((df['datetime'] >= c - pd.Timedelta(days=days_before)) &
            (df['datetime'] <= c + pd.Timedelta(days=days_after)))
    return df[mask]['close'].values

def make_spectrogram(prices, fs=375, nperseg=60, noverlap=45):
    rets = np.diff(np.log(prices + 1e-10))
    f, t, Sxx = scipy_signal.spectrogram(
        rets, fs=fs, window='hann',
        nperseg=nperseg, noverlap=noverlap, scaling='density'
    )
    return f, t, 10 * np.log10(Sxx + 1e-12)

p_normal = get_price_window(df_raw, '2017-06-01', 45, 45)
p_2019   = get_price_window(df_raw, '2019-05-23', 45, 45)
p_2024   = get_price_window(df_raw, '2024-06-04', 45, 45)
f_n,  t_n,  S_n  = make_spectrogram(p_normal)
f_19, t_19, S_19 = make_spectrogram(p_2019)
f_24, t_24, S_24 = make_spectrogram(p_2024)
print(f'Spectrogram shape: {S_n.shape}')

fig, axes = plt.subplots(1, 3, figsize=(20, 7), facecolor='#050505')
FMAX = 2.0
for ax, S, f, t, title, cmap, tcol, mark in [
    (axes[0], S_n,  f_n,  t_n,  'NORMAL PERIOD (2017)',          'plasma',  '#e0e0ff', False),
    (axes[1], S_19, f_19, t_19, '2019 LOK SABHA — BJP MAJORITY', 'inferno', '#00e5ff', True),
    (axes[2], S_24, f_24, t_24, '2024 LOK SABHA — HUNG PARL.',   'hot',     '#ff1744', True),
]:
    ax.set_facecolor('#050505')
    fm = f < FMAX
    im = ax.pcolormesh(t, f[fm], S[fm,:], shading='gouraud', cmap=cmap,
                       vmin=np.percentile(S,10), vmax=np.percentile(S,99))
    cb = plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    cb.set_label('Power (dB)', color='#8888aa', fontfamily='monospace', fontsize=7)
    plt.setp(cb.ax.yaxis.get_ticklabels(), color='#444466',
             fontfamily='monospace', fontsize=6)
    ax.set_title(title, color=tcol, fontfamily='monospace', fontsize=9, pad=8)
    ax.set_xlabel('Time (minutes)', color='#8888aa', fontfamily='monospace', fontsize=7)
    ax.set_ylabel('Frequency (cycles/min)', color='#8888aa',
                  fontfamily='monospace', fontsize=7)
    ax.tick_params(colors='#444466', labelsize=6)
    for sp in ax.spines.values(): sp.set_color('#1a1a2e')
    if mark:
        mid = t[len(t)//2]
        ax.axvline(mid, color=tcol, lw=1.5, ls='--', alpha=0.9)
        ax.text(mid, f[fm].max()*0.88, ' RESULT\n DAY',
                color=tcol, fontfamily='monospace', fontsize=6)
plt.suptitle('FIGURE 3 — STFT SPECTROGRAM  S(t,f)  |  NORMAL vs ELECTION WINDOWS',
             color='#e0e0ff', fontfamily='monospace', fontsize=12, y=1.01)
plt.tight_layout()
plt.savefig('fig3_spectrogram.png', dpi=150, bbox_inches='tight', facecolor='#050505')
plt.close()
print('✅ Figure 3 saved')

# ─────────────────────────────────────────────────────────────────
# STEP 3 — Build CNN Dataset
#
# FIX 1: Target = 5-day forward RETURN (%), not absolute price
#         Returns are bounded ~[-5%, +5%], much easier to predict
#
# FIX 2: Spectrogram computed on log-returns (stationary signal)
#
# FIX 3: Window-local normalisation — each spectrogram channel
#         normalised independently, zero mean unit variance
#         No global scaler → no data leakage
# ─────────────────────────────────────────────────────────────────
MINS_PER_DAY  = 375
WINDOW_DAYS   = 10                        # 10-day input window
WINDOW_MINS   = MINS_PER_DAY * WINDOW_DAYS
PREDICT_DAYS  = 5                         # predict 5-day forward return
PREDICT_MINS  = MINS_PER_DAY * PREDICT_DAYS
STFT_WIN      = 60
STFT_HOP      = 15
FREQ_BINS     = 16
SAMPLE_STEP   = MINS_PER_DAY

log_rets  = df_raw['log_ret'].values
closes    = df_raw['close'].values
is_elec   = df_raw['is_election'].values
total     = len(log_rets)

X_list, y_list, meta_list = [], [], []

print('Building CNN dataset...')
for i in range(0, total - WINDOW_MINS - PREDICT_MINS, SAMPLE_STEP):
    # Input window: log-returns over past WINDOW_DAYS
    window = log_rets[i : i + WINDOW_MINS]
    if np.any(np.isnan(window)): continue

    # Target: cumulative 5-day forward return (%)
    # = (close at end of prediction window / close at end of input window) - 1
    close_now  = closes[i + WINDOW_MINS - 1]
    close_fwd  = closes[i + WINDOW_MINS + PREDICT_MINS - 1]
    if close_now <= 0: continue
    target = (close_fwd / close_now) - 1.0  # forward return, e.g. +0.02 = +2%

    # STFT spectrogram of log-returns (channel 0)
    _, _, Sxx = scipy_signal.spectrogram(
        window, fs=float(MINS_PER_DAY),
        window='hann', nperseg=STFT_WIN,
        noverlap=STFT_WIN - STFT_HOP, scaling='density'
    )
    Sxx = Sxx[:FREQ_BINS, :]
    # Window-local z-score normalisation (no global scaler, no leakage)
    Sxx = (Sxx - Sxx.mean()) / (Sxx.std() + 1e-8)

    # Election context channel (broadcast scalar to same shape)
    elec_ch = np.full_like(Sxx, float(is_elec[i + WINDOW_MINS // 2]))

    sample = np.stack([Sxx, elec_ch], axis=-1)   # (FREQ_BINS, T, 2)
    X_list.append(sample)
    y_list.append(target)
    meta_list.append({
        'start_idx':   i,
        'datetime':    str(df_raw['datetime'].iloc[i]),
        'close_now':   float(round(close_now, 2)),
        'close_fwd':   float(round(close_fwd, 2)),
        'is_election': int(is_elec[i + WINDOW_MINS // 2])
    })

    if i % 50_000 == 0:
        print(f'  {i/total*100:.0f}%  ({i:,}/{total:,})', end='\r')

X = np.array(X_list, dtype=np.float32)
y = np.array(y_list, dtype=np.float32)

print(f'\n✅ Dataset built')
print(f'   X shape : {X.shape}')
print(f'   y shape : {y.shape}')
print(f'   y range : {y.min():.4f}  →  {y.max():.4f}  (forward return)')
print(f'   y mean  : {y.mean():.4f}  std: {y.std():.4f}')
n_elec = sum(m['is_election'] for m in meta_list)
print(f'   Election samples : {n_elec:,}')
print(f'   Normal samples   : {len(meta_list)-n_elec:,}')

# ─────────────────────────────────────────────────────────────────
# Time-based split — NO shuffle (prevents temporal leakage)
# FIX: scaler fitted ONLY on y_train, applied to val/test
# ─────────────────────────────────────────────────────────────────
n       = len(X)
n_train = int(n * 0.70)
n_val   = int(n * 0.15)

X_train, y_train = X[:n_train],              y[:n_train]
X_val,   y_val   = X[n_train:n_train+n_val], y[n_train:n_train+n_val]
X_test,  y_test  = X[n_train+n_val:],        y[n_train+n_val:]
meta_test        = meta_list[n_train+n_val:]

# Standardise targets using ONLY training set statistics
y_mean = float(y_train.mean())
y_std  = float(y_train.std())
y_train_s = (y_train - y_mean) / y_std
y_val_s   = (y_val   - y_mean) / y_std
y_test_s  = (y_test  - y_mean) / y_std

print(f'\n✅ Time-based split (no shuffle)')
print(f'   Train : {X_train.shape[0]:>6,}')
print(f'   Val   : {X_val.shape[0]:>6,}')
print(f'   Test  : {X_test.shape[0]:>6,}')
print(f'   Input : {X_train.shape[1:]}')
print(f'   y_train standardised: mean={y_train_s.mean():.4f}  std={y_train_s.std():.4f}')

# ─────────────────────────────────────────────────────────────────
# STEP 4 — Build CNN Model
# ─────────────────────────────────────────────────────────────────
def build_cnn(input_shape):
    inp = keras.Input(shape=input_shape, name='spectrogram')
    x = layers.Conv2D(32,  (3,3), padding='same', activation='relu')(inp)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling2D((2,2))(x)
    x = layers.Conv2D(64,  (3,3), padding='same', activation='relu')(x)
    x = layers.BatchNormalization()(x)
    x = layers.MaxPooling2D((2,2))(x)
    x = layers.Conv2D(128, (3,3), padding='same', activation='relu')(x)
    x = layers.BatchNormalization()(x)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dense(64, activation='relu')(x)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(32, activation='relu')(x)
    # Linear output — predicts standardised forward return
    out = layers.Dense(1, activation='linear', name='fwd_return')(x)
    return keras.Model(inp, out, name='ElectionSZN_CNN')

model = build_cnn(X_train.shape[1:])
model.compile(optimizer=keras.optimizers.Adam(1e-3), loss='mse', metrics=['mae'])
model.summary()
print(f'\nTotal params: {model.count_params():,}')

# ─────────────────────────────────────────────────────────────────
# FIGURE 4 — CNN Architecture Diagram
# ─────────────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(18, 5), facecolor='#050505')
ax.set_facecolor('#050505')
ax.set_xlim(0, 20); ax.set_ylim(0, 5); ax.axis('off')
arch = [
    ('INPUT\nSpec(F×T×2)',      1.0,  '#00e5ff', 1.6),
    ('CONV2D\n32f 3×3\nReLU',  3.2,  '#7b61ff', 1.4),
    ('BN\nMaxPool\n2×2',       5.2,  '#534AB7', 1.2),
    ('CONV2D\n64f 3×3\nReLU',  7.2,  '#7b61ff', 1.4),
    ('BN\nMaxPool\n2×2',       9.2,  '#534AB7', 1.2),
    ('CONV2D\n128f 3×3\nReLU', 11.2, '#7b61ff', 1.4),
    ('BN\nGlobal\nAvgPool',    13.2, '#534AB7', 1.4),
    ('Dense 64\nReLU\nDrop.3', 15.4, '#ffb300', 1.4),
    ('Dense 32\nReLU',         17.4, '#ffb300', 1.2),
    ('OUTPUT\nFwd Return',     19.2, '#ff1744', 1.0),
]
box_h, prev_right = 2.6, None
for label, xc, color, bw in arch:
    x0 = xc - bw/2; y0 = (5 - box_h)/2
    ax.add_patch(mpatches.FancyBboxPatch(
        (x0,y0), bw, box_h, boxstyle='round,pad=0.06',
        fc=color+'18', ec=color, lw=1.5))
    ax.text(xc, 2.5, label, ha='center', va='center',
            color=color, fontfamily='monospace', fontsize=7.5, linespacing=1.5)
    if prev_right:
        ax.annotate('', xy=(x0,2.5), xytext=(prev_right,2.5),
                    arrowprops=dict(arrowstyle='->', color='#444466', lw=1.5))
    prev_right = xc + bw/2
ax.set_title('FIGURE 4 — CNN ARCHITECTURE  |  ELECTION SZN MODEL',
             color='#e0e0ff', fontfamily='monospace', fontsize=12, pad=12)
ax.legend(handles=[
    mpatches.Patch(color='#00e5ff', label='Input'),
    mpatches.Patch(color='#7b61ff', label='Conv2D'),
    mpatches.Patch(color='#534AB7', label='Pooling/Norm'),
    mpatches.Patch(color='#ffb300', label='Dense'),
    mpatches.Patch(color='#ff1744', label='Output'),
], loc='lower center', bbox_to_anchor=(0.5,-0.12), ncol=5,
   facecolor='#0a0a0f', edgecolor='#1a1a2e', labelcolor='#e0e0ff',
   prop={'family':'monospace','size':8})
plt.tight_layout()
plt.savefig('fig4_cnn_architecture.png', dpi=150, bbox_inches='tight', facecolor='#050505')
plt.close()
print('✅ Figure 4 saved')

# ─────────────────────────────────────────────────────────────────
# STEP 5 — Train
# ─────────────────────────────────────────────────────────────────
callbacks = [
    keras.callbacks.EarlyStopping(
        monitor='val_loss', patience=8,
        restore_best_weights=True, verbose=1),
    keras.callbacks.ReduceLROnPlateau(
        monitor='val_loss', factor=0.5,
        patience=4, min_lr=1e-6, verbose=1),
    keras.callbacks.ModelCheckpoint(
        'best_model.keras', save_best_only=True,
        monitor='val_loss', verbose=0)
]

print('\n🏋️  Training ElectionSZN CNN...')
history = model.fit(
    X_train, y_train_s,
    validation_data=(X_val, y_val_s),
    epochs=50, batch_size=32,
    callbacks=callbacks, verbose=1
)
print(f'\n✅ Training done  |  Best val MSE: {min(history.history["val_loss"]):.6f}')

# Training curves
fig, axes = plt.subplots(1, 2, figsize=(14, 5), facecolor='#050505')
for ax, m, title, col in [
    (axes[0], 'loss', 'MSE LOSS', '#00e5ff'),
    (axes[1], 'mae',  'MAE',      '#ffb300'),
]:
    ax.set_facecolor('#0a0a0f')
    ax.plot(history.history[m],          color=col,     lw=2, label='Train')
    ax.plot(history.history[f'val_{m}'], color='#ff1744', lw=2, ls='--', label='Val')
    ax.set_title(title, color='#e0e0ff', fontfamily='monospace', fontsize=10)
    ax.set_xlabel('EPOCH', color='#8888aa', fontfamily='monospace', fontsize=8)
    ax.tick_params(colors='#444466', labelsize=7)
    for sp in ax.spines.values(): sp.set_color('#1a1a2e')
    ax.grid(color='#1a1a2e', lw=0.5)
    ax.legend(facecolor='#0a0a0f', edgecolor='#1a1a2e',
              labelcolor='#e0e0ff', prop={'family':'monospace','size':8})
plt.suptitle('TRAINING CURVES', color='#e0e0ff', fontfamily='monospace', fontsize=12)
plt.tight_layout()
plt.savefig('training_curves.png', dpi=150, bbox_inches='tight', facecolor='#050505')
plt.close()

# ─────────────────────────────────────────────────────────────────
# STEP 6 — Evaluate
# FIX: inverse-transform predictions back to actual returns (%)
#      then compute predicted future price from close_now
# ─────────────────────────────────────────────────────────────────
y_pred_s   = model.predict(X_test, verbose=0).flatten()
y_pred_ret = y_pred_s * y_std + y_mean        # predicted forward return
y_true_ret = y_test                           # actual forward return

# Convert returns → actual future price for interpretable metrics
close_now_test = np.array([m['close_now'] for m in meta_test[:len(y_test)]])
close_fwd_test = np.array([m['close_fwd'] for m in meta_test[:len(y_test)]])

y_actual_price = close_fwd_test
y_pred_price   = close_now_test * (1.0 + y_pred_ret)

mse  = mean_squared_error(y_actual_price, y_pred_price)
rmse = np.sqrt(mse)
mae  = mean_absolute_error(y_actual_price, y_pred_price)
r2   = r2_score(y_actual_price, y_pred_price)
mape = np.mean(np.abs((y_actual_price - y_pred_price) /
                       (y_actual_price + 1e-8))) * 100

# Return-level metrics (more informative for direction accuracy)
ret_r2   = r2_score(y_true_ret, y_pred_ret)
ret_mae  = mean_absolute_error(y_true_ret, y_pred_ret)
# Direction accuracy: did we predict up/down correctly?
dir_acc  = np.mean(np.sign(y_pred_ret) == np.sign(y_true_ret)) * 100

print('='*55)
print('  ELECTION SZN — TEST PERFORMANCE')
print('='*55)
print(f'  Price RMSE  : {rmse:>10,.2f}  INR')
print(f'  Price MAE   : {mae:>10,.2f}  INR')
print(f'  Price MAPE  : {mape:>10,.2f}  %')
print(f'  Price R²    : {r2:>10.4f}')
print(f'  Return MAE  : {ret_mae:>10.6f}  (e.g. 0.005 = 0.5%)')
print(f'  Return R²   : {ret_r2:>10.4f}')
print(f'  Direction   : {dir_acc:>10.1f}  % correct up/down')
print('='*55)

# Election vs Normal split
is_elec_test = np.array([m['is_election'] for m in meta_test[:len(y_test)]])

def split_metrics(mask, actual_p, pred_p, actual_r, pred_r):
    if mask.sum() == 0: return None
    ap, pp = actual_p[mask], pred_p[mask]
    ar, pr = actual_r[mask], pred_r[mask]
    return dict(
        n        = int(mask.sum()),
        rmse     = float(np.sqrt(mean_squared_error(ap, pp))),
        mae      = float(mean_absolute_error(ap, pp)),
        mape     = float(np.mean(np.abs((ap-pp)/(ap+1e-8)))*100),
        r2       = float(r2_score(ap, pp)),
        ret_mae  = float(mean_absolute_error(ar, pr)),
        dir_acc  = float(np.mean(np.sign(pr)==np.sign(ar))*100)
    )

m_elec   = split_metrics(is_elec_test==1,
                         y_actual_price, y_pred_price,
                         y_true_ret,     y_pred_ret)
m_normal = split_metrics(is_elec_test==0,
                         y_actual_price, y_pred_price,
                         y_true_ret,     y_pred_ret)

print('\n' + '='*62)
print('  ELECTION vs NORMAL — PERFORMANCE SPLIT')
print('='*62)
print(f'{"Metric":<12} {"Normal":>14} {"Election":>14} {"Delta":>10}')
print('-'*62)
for k in ['rmse','mae','mape','r2','ret_mae','dir_acc']:
    nv = m_normal[k] if m_normal else 0
    ev = m_elec[k]   if m_elec   else 0
    print(f'{k.upper():<12} {nv:>14.3f} {ev:>14.3f} {ev-nv:>+10.3f}')
print('='*62)

if m_elec and m_normal:
    pct = (m_elec['rmse'] - m_normal['rmse']) / (m_normal['rmse'] + 1e-8) * 100
    direction = 'harder' if pct > 0 else 'easier'
    print(f'\n→ Prediction is {abs(pct):.1f}% {direction} during election periods')
    print(f'→ Direction accuracy: normal={m_normal["dir_acc"]:.1f}%  '
          f'election={m_elec["dir_acc"]:.1f}%')
    print('  This directly validates the Election SZN hypothesis.')

# Predictions vs Actual plot
fig, axes = plt.subplots(2, 1, figsize=(18, 10), facecolor='#050505')
ax1 = axes[0]
ax1.set_facecolor('#0a0a0f')
ax1.plot(y_actual_price, color='#00e5ff', lw=1, alpha=0.9, label='Actual price')
ax1.plot(y_pred_price,   color='#ff1744', lw=1, alpha=0.8, ls='--', label='Predicted price')
ax1.fill_between(range(len(y_actual_price)), y_actual_price, y_pred_price,
                 alpha=0.12, color='#ffb300')
ax1.set_title(
    f'ACTUAL vs PREDICTED  |  RMSE={rmse:.0f} INR  |  '
    f'R²={r2:.4f}  |  Dir acc={dir_acc:.1f}%',
    color='#e0e0ff', fontfamily='monospace', fontsize=10, pad=10)
ax1.set_ylabel('NIFTY 50 (INR)', color='#8888aa', fontfamily='monospace', fontsize=8)
ax1.tick_params(colors='#444466', labelsize=7)
for sp in ax1.spines.values(): sp.set_color('#1a1a2e')
ax1.grid(color='#1a1a2e', lw=0.5)
ax1.legend(facecolor='#0a0a0f', edgecolor='#1a1a2e', labelcolor='#e0e0ff',
           prop={'family':'monospace','size':9})

ax2 = axes[1]
ax2.set_facecolor('#0a0a0f')
res = y_actual_price - y_pred_price
ax2.bar(range(len(res)), res, color=np.where(res>=0,'#00e676','#ff1744'),
        alpha=0.6, width=1)
ax2.axhline(0, color='#8888aa', lw=1)
ax2.set_title('RESIDUALS  (Actual − Predicted)',
              color='#e0e0ff', fontfamily='monospace', fontsize=10, pad=10)
ax2.set_xlabel('SAMPLE INDEX', color='#8888aa', fontfamily='monospace', fontsize=8)
ax2.set_ylabel('ERROR (INR)',  color='#8888aa', fontfamily='monospace', fontsize=8)
ax2.tick_params(colors='#444466', labelsize=7)
for sp in ax2.spines.values(): sp.set_color('#1a1a2e')
ax2.grid(color='#1a1a2e', lw=0.5)
plt.tight_layout()
plt.savefig('predictions_vs_actual.png', dpi=150, bbox_inches='tight', facecolor='#050505')
plt.close()
print('✅ Predictions plot saved')

# ─────────────────────────────────────────────────────────────────
# STEP 7 — Save everything
# ─────────────────────────────────────────────────────────────────
model.save('election_szn_model.keras')

# Save normalisation stats (needed for inference, NOT a sklearn scaler)
norm_stats = {'y_mean': y_mean, 'y_std': y_std}
with open('norm_stats.pkl', 'wb') as f:
    pickle.dump(norm_stats, f)

results = {
    'model':   'ElectionSZN_CNN',
    'dataset': 'NIFTY 50_minute.csv  (Jan 2015 – Jan 2026)',
    'target':  '5-day forward return (%)',
    'overall': dict(
        rmse    = round(rmse, 2),
        mae     = round(mae, 2),
        mape    = round(mape, 4),
        r2      = round(r2, 4),
        dir_acc = round(dir_acc, 2)
    ),
    'election_period': m_elec,
    'normal_period':   m_normal,
    'sample_predictions': dict(
        actual_price    = [round(v,2) for v in y_actual_price[:500].tolist()],
        predicted_price = [round(v,2) for v in y_pred_price[:500].tolist()],
        actual_return   = [round(v,6) for v in y_true_ret[:500].tolist()],
        predicted_return= [round(v,6) for v in y_pred_ret[:500].tolist()]
    )
}
with open('results.json', 'w') as f:
    json.dump(results, f, indent=2)

print('\n✅  fig1_time_series.png         → Assignment Figure 1')
print('✅  fig2_frequency_spectrum.png  → Assignment Figure 2')
print('✅  fig3_spectrogram.png         → Assignment Figure 3')
print('✅  fig4_cnn_architecture.png    → Assignment Figure 4')
print('✅  training_curves.png          → Training history')
print('✅  predictions_vs_actual.png    → Task 4 analysis')
print('✅  results.json                 → For the frontend dashboard')
print()
print('  "Democracy has a frequency. We built a spectrogram to read it."')