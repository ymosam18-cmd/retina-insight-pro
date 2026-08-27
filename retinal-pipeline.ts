/**
 * Client-side Retinal Fundus Image Processing Pipeline
 * Faithful port of the OpenCV-based Streamlit pipeline using Canvas API.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export interface QualityMetrics {
  sharpness: number;
  illumination: number;
  fovRatio: number;
  sharpPass: boolean;
  illumPass: boolean;
  fovPass: boolean;
  overallPass: boolean;
}

export interface FovMaskResult {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface ClassificationResult {
  stage: string;
  confidence: number;
  severity: "normal" | "mild" | "moderate" | "severe" | "proliferative";
  description: string;
}

export interface HeatmapResult {
  data: ImageData;
  width: number;
  height: number;
}

// ── Canvas Helpers ──────────────────────────────────────────────────────────────

function getPixelData(img: HTMLImageElement): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function toGrayscale(imgData: ImageData): Float64Array {
  const { data, width, height } = imgData;
  const gray = new Float64Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    // Standard luminance
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return gray;
}

function greenChannel(imgData: ImageData): Float64Array {
  const { data, width, height } = imgData;
  const green = new Float64Array(width * height);
  for (let i = 0; i < width * height; i++) {
    green[i] = data[i * 4 + 1];
  }
  return green;
}

// ── Laplacian Variance (Sharpness) ──────────────────────────────────────────────

function laplacianVariance(gray: Float64Array, w: number, h: number): number {
  // 3×3 Laplacian kernel: [[0,1,0],[1,-4,1],[0,1,0]]
  const lap = new Float64Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      lap[i] =
        -4 * gray[i] +
        gray[i - 1] +
        gray[i + 1] +
        gray[i - w] +
        gray[i + w];
    }
  }
  let sum = 0;
  let sumSq = 0;
  const count = w * h;
  for (let i = 0; i < count; i++) {
    sum += lap[i];
  }
  const mean = sum / count;
  for (let i = 0; i < count; i++) {
    sumSq += (lap[i] - mean) * (lap[i] - mean);
  }
  return sumSq / count;
}

// ── Simple Resize (Bilinear) ───────────────────────────────────────────────────

function resizeImageData(
  imgData: ImageData,
  tw: number,
  th: number,
): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d")!;
  // We need the source as an off-screen image
  const src = document.createElement("canvas");
  src.width = imgData.width;
  src.height = imgData.height;
  src.getContext("2d")!.putImageData(imgData, 0, 0);
  ctx.drawImage(src, 0, 0, tw, th);
  return ctx.getImageData(0, 0, tw, th);
}

// ── CLAHE (simplified single-channel histogram equalisation) ────────────────────

function applyCLAHEChannel(
  channel: Uint8ClampedArray,
  w: number,
  h: number,
  clipLimit = 3.0,
  tileSize = 8,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(channel.length);
  const tilesX = Math.ceil(w / tileSize);
  const tilesY = Math.ceil(h / tileSize);

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const x0 = tx * tileSize;
      const y0 = ty * tileSize;
      const x1 = Math.min(x0 + tileSize, w);
      const y1 = Math.min(y0 + tileSize, h);

      // Build histogram
      const hist = new Uint32Array(256);
      let count = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          hist[channel[y * w + x]]++;
          count++;
        }
      }

      // Clip histogram
      const limit = Math.floor((clipLimit * count) / 256);
      let excess = 0;
      for (let i = 0; i < 256; i++) {
        if (hist[i] > limit) {
          excess += hist[i] - limit;
          hist[i] = limit;
        }
      }
      // Redistribute excess
      const avgInc = Math.floor(excess / 256);
      const residual = excess - avgInc * 256;
      for (let i = 0; i < 256; i++) {
        hist[i] += avgInc;
        if (i < residual) hist[i]++;
      }

      // CDF
      const cdf = new Float64Array(256);
      cdf[0] = hist[0];
      for (let i = 1; i < 256; i++) cdf[i] = cdf[i - 1] + hist[i];
      const cdfMin = cdf.find((v) => v > 0)!;
      const lut = new Uint8ClampedArray(256);
      for (let i = 0; i < 256; i++) {
        lut[i] = Math.round(((cdf[i] - cdfMin) / (count - cdfMin)) * 255) || 0;
      }

      // Apply LUT
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          out[y * w + x] = lut[channel[y * w + x]];
        }
      }
    }
  }
  return out;
}

// ── RGB ↔ Lab (simplified) ────────────────────────────────────────────────────

function rgbToLab(imgData: ImageData): {
  l: Uint8ClampedArray;
  a: Uint8ClampedArray;
  b: Uint8ClampedArray;
} {
  const { data, width, height } = imgData;
  const n = width * height;
  const l = new Uint8ClampedArray(n);
  const aCh = new Uint8ClampedArray(n);
  const bCh = new Uint8ClampedArray(n);

  for (let i = 0; i < n; i++) {
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;

    // Linear sRGB
    const rl = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    const gl = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    const bl = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    // XYZ (D65)
    let x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
    let y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175;
    let z = (rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041) / 1.08883;

    const f = (t: number) =>
      t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
    x = f(x);
    y = f(y);
    z = f(z);

    l[i] = Math.round(Math.max(0, Math.min(255, 116 * y - 16)));
    aCh[i] = Math.round(Math.max(0, Math.min(255, 500 * (x - y) + 128)));
    bCh[i] = Math.round(Math.max(0, Math.min(255, 200 * (y - z) + 128)));
  }
  return { l, a: aCh, b: bCh };
}

function labToRgb(
  lCh: Uint8ClampedArray,
  aCh: Uint8ClampedArray,
  bCh: Uint8ClampedArray,
  w: number,
  h: number,
): ImageData {
  const imgData = new ImageData(w, h);
  const data = imgData.data;
  const n = w * h;

  for (let i = 0; i < n; i++) {
    const ly = (lCh[i] + 16) / 116;
    const ax = (aCh[i] - 128) / 500;
    const bz = (bCh[i] - 128) / 200;

    const fy = ly;
    const fx = ly + ax;
    const fz = ly - bz;

    const finv = (t: number) =>
      t > 0.206897 ? t * t * t : (t - 16 / 116) / 7.787;

    let x = 0.95047 * finv(fx);
    let y = 1.0 * finv(fy);
    let z = 1.08883 * finv(fz);

    let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
    let g = x * -0.969266 + y * 1.8760108 + z * 0.041556;
    let bv = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;

    const fromLin = (c: number) =>
      c > 0.0031308
        ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055
        : 12.92 * c;
    r = Math.max(0, Math.min(1, fromLin(r)));
    g = Math.max(0, Math.min(1, fromLin(g)));
    bv = Math.max(0, Math.min(1, fromLin(bv)));

    data[i * 4] = Math.round(r * 255);
    data[i * 4 + 1] = Math.round(g * 255);
    data[i * 4 + 2] = Math.round(bv * 255);
    data[i * 4 + 3] = 255;
  }
  return imgData;
}

// ── RGB → HSV ─────────────────────────────────────────────────────────────────

function rgbToHsv(
  imgData: ImageData,
): { h: Float64Array; s: Float64Array; v: Float64Array } {
  const { data, width, height } = imgData;
  const n = width * height;
  const h = new Float64Array(n);
  const s = new Float64Array(n);
  const v = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    v[i] = max;
    s[i] = max === 0 ? 0 : d / max;

    if (d === 0) {
      h[i] = 0;
    } else if (max === r) {
      h[i] = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h[i] = ((b - r) / d + 2) / 6;
    } else {
      h[i] = ((r - g) / d + 4) / 6;
    }
    // Convert hue to 0-180 range (OpenCV convention)
    h[i] = h[i] * 180;
  }
  return { h, s, v };
}

// ── Pipeline Functions ─────────────────────────────────────────────────────────

export function validateImage(img: HTMLImageElement): {
  valid: boolean;
  width: number;
  height: number;
} {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  return { valid: w >= 256 && h >= 256, width: w, height: h };
}

export function assessQuality(
  img: HTMLImageElement,
): { metrics: QualityMetrics; fovMask: FovMaskResult } {
  const imgData = getPixelData(img);
  const gray = toGrayscale(imgData);
  const w = imgData.width;
  const h = imgData.height;

  const sharpness = laplacianVariance(gray, w, h);
  const sharpPass = sharpness > 45.0;

  // Mean illumination
  let sum = 0;
  for (let i = 0; i < gray.length; i++) sum += gray[i];
  const illumination = sum / gray.length;
  const illumPass = illumination > 20.0 && illumination < 230.0;

  // FOV mask via green channel threshold
  const green = greenChannel(imgData);
  const fovMaskData = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) {
    fovMaskData[i] = green[i] > 15 ? 255 : 0;
  }
  let fovCount = 0;
  for (let i = 0; i < fovMaskData.length; i++) {
    if (fovMaskData[i] > 0) fovCount++;
  }
  const fovRatio = (fovCount / (w * h)) * 100;
  const fovPass = fovRatio > 15.0;

  return {
    metrics: {
      sharpness,
      illumination,
      fovRatio,
      sharpPass,
      illumPass,
      fovPass,
      overallPass: sharpPass && illumPass && fovPass,
    },
    fovMask: { data: fovMaskData, width: w, height: h },
  };
}

export function preprocessImage(
  img: HTMLImageElement,
  targetSize = 224,
): { enhanced: ImageData; normalized: Float32Array } {
  const imgData = getPixelData(img);
  const resized = resizeImageData(imgData, targetSize, targetSize);

  // CLAHE on L channel
  const lab = rgbToLab(resized);
  const cl = applyCLAHEChannel(lab.l, targetSize, targetSize, 3.0, 8);
  const enhanced = labToRgb(cl, lab.a, lab.b, targetSize, targetSize);

  // Normalize
  const n = targetSize * targetSize;
  const normalized = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    normalized[i * 3] = enhanced.data[i * 4] / 255;
    normalized[i * 3 + 1] = enhanced.data[i * 4 + 1] / 255;
    normalized[i * 3 + 2] = enhanced.data[i * 4 + 2] / 255;
  }

  return { enhanced, normalized };
}

export function classifyDR(
  _img: HTMLImageElement,
  enhancedImg: ImageData,
): ClassificationResult & { redPixelRatio: number } {
  const n = enhancedImg.width * enhancedImg.height;
  const { h: hue, s: sat, v: val } = rgbToHsv(enhancedImg);

  // Red lesion detection in HSV (0-10 hue, S>50, V>50)
  let redCount = 0;
  for (let i = 0; i < n; i++) {
    if (hue[i] >= 0 && hue[i] <= 10 && sat[i] > 50 / 255 && val[i] > 50 / 255) {
      redCount++;
    }
  }
  const redPixelRatio = (redCount / n) * 100;

  if (redPixelRatio < 0.2) {
    return {
      stage: "No Diabetic Retinopathy (Normal Retina)",
      confidence: 98.4,
      severity: "normal",
      description:
        "Retina surface clear. No microaneurysms or exudates detected.",
      redPixelRatio,
    };
  } else if (redPixelRatio < 0.8) {
    return {
      stage: "Mild Diabetic Retinopathy",
      confidence: 89.1,
      severity: "mild",
      description:
        "Early signs detected. Microaneurysms present but low risk.",
      redPixelRatio,
    };
  } else if (redPixelRatio < 2.0) {
    return {
      stage: "Moderate Diabetic Retinopathy",
      confidence: 92.5,
      severity: "moderate",
      description:
        "Clear microaneurysms and intraretinal hemorrhages observed. Clinical evaluation advised.",
      redPixelRatio,
    };
  } else if (redPixelRatio < 4.5) {
    return {
      stage: "Severe Diabetic Retinopathy",
      confidence: 95.2,
      severity: "severe",
      description:
        "High volume of microaneurysms, blot hemorrhages, and cotton wool spots present.",
      redPixelRatio,
    };
  } else {
    return {
      stage: "Proliferative Diabetic Retinopathy (PDR)",
      confidence: 97.8,
      severity: "proliferative",
      description:
        "Critical advanced stage. Neovascularization (new abnormal blood vessels growth) detected.",
      redPixelRatio,
    };
  }
}

export function generateHeatmap(
  enhancedImg: ImageData,
  redPixelRatio: number,
): HeatmapResult {
  const { width, height, data } = enhancedImg;
  const out = new ImageData(width, height);
  const oData = out.data;

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];

    // Convert to grayscale intensity
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    let hr: number;
    let hg: number;
    let hb: number;

    if (redPixelRatio >= 0.2) {
      // JET-like colormap simulation based on intensity
      const t = gray / 255;
      if (t < 0.25) {
        hr = 0;
        hg = t * 4 * 255;
        hb = 255;
      } else if (t < 0.5) {
        hr = 0;
        hg = 255;
        hb = (1 - (t - 0.25) * 4) * 255;
      } else if (t < 0.75) {
        hr = (t - 0.5) * 4 * 255;
        hg = 255;
        hb = 0;
      } else {
        hr = 255;
        hg = (1 - (t - 0.75) * 4) * 255;
        hb = 0;
      }
    } else {
      // Ocean-like colormap
      const t = gray / 255;
      hr = t * 0.2 * 255;
      hg = t * 0.6 * 255;
      hb = Math.min(1, t * 1.2) * 255;
    }

    // Blend with original (50/50)
    oData[i * 4] = Math.round(r * 0.5 + hr * 0.5);
    oData[i * 4 + 1] = Math.round(g * 0.5 + hg * 0.5);
    oData[i * 4 + 2] = Math.round(b * 0.5 + hb * 0.5);
    oData[i * 4 + 3] = 255;
  }

  return { data: out, width, height };
}
