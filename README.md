# ELECTION SZN: Market Intelligence Dashboard

**🔴 Live Dashboard:** [https://election-szn.vercel.app/](https://election-szn.vercel.app/)

A high-fidelity quantitative research project applying signal processing techniques to financial time-series data during Indian Lok Sabha elections (2019 & 2024).

### Team Members
- Abhiram H — TCR24CS002
- Ayush Raj — TCR24CS018
- Jerome Parekkattil — TCR24CS037
- Royce Pathayil Saji — TCR24CS058
- Sidharth V Jain — TCR24CS063

This repository contains both the **underlying CNN predictive model** (trained on Nifty 50 1-min data) and the **"ElectionSZN" static dashboard** used to visualize its findings.

---

## 🧠 The Predictive Model
The quantitative foundation of this project is isolated in the `/model/` directory. Instead of standard price-level regression, this model converts financial volatility into 2D spectrograms and scans them for patterns using a Convolutional Neural Network (CNN).

### Model Architecture
The `ElectionSZN_CNN v2` architecture is a 3-block CNN designed for feature extraction from STFT matrices:
1. **Input:** STFT spectrogram (16 frequencies × 125 time steps × 2 channels) + Election proximity mask.
2. **Conv Block 1:** 32 filters (3×3), ReLU, BatchNorm, MaxPool (2×2).
3. **Conv Block 2:** 64 filters (3×3), ReLU, BatchNorm, MaxPool (2×2).
4. **Conv Block 3:** 128 filters (3×3), ReLU, BatchNorm, Global Average Pooling.
5. **Dense Head:** FC(64) → Dropout(0.3) → FC(32) → Output Dense(1).

### Model Files Overview
Located in the `model/` directory:
- `Election_SZN_Model.py` / `.ipynb`: Core architecture, training loop, and inference scripts.
- `best_model.keras` / `election_szn_model.keras`: Saved weights from training.
- `scaler.pkl` & `norm_stats.pkl`: Pickled transformations for testing new data.
- `results.json`: Output metrics (RMSE, MAE, R², Directions) for Pre-Elec, Live, Result Day, and Normal phases.

### Figures & Training Curves
- `training_curves.png`: Loss (MSE) and MAE over 50 epochs (Adam, 1e-3, EarlyStopping patience=8).
- `fig1_time_series.png` to `fig3_spectrogram.png`: Visual progression of raw Nifty 50 data → Log Returns → STFT Spectrogram transformation.
- `predictions_vs_actual.png`: Forward 5-day return mapping proving the `R² = 0.81` accuracy.
- `fig4_cnn_architecture.png`: Visual layout of the CNN blocks.

---

## 🚀 Deployment
This project is designed specifically for zero-config deployment to Vercel. 
The root contains `vercel.json` which marks the framework as `null` and applies strict `Cache-Control` max-age headers for instant static asset delivery.
