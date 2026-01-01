// Utility functions for text-based part number scanning from images.
// Uses tesseract.js with lightweight preprocessing to reduce common OCR mistakes.

import { createWorker, PSM } from "tesseract.js";

const CHAR_WHITELIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-";
const MIN_TOKEN_LENGTH = 3;

// Common OCR confusions we want to expand for downstream validation.
const CONFUSION_GROUPS: string[][] = [
  ["8", "B"],
  ["0", "O"],
  ["1", "I", "L"],
  ["5", "S"],
];

const clamp = (v: number) => Math.max(0, Math.min(255, v));

function preprocessCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d");
  const srcCtx = source.getContext("2d");
  if (!ctx || !srcCtx) return source;

  const imageData = srcCtx.getImageData(0, 0, source.width, source.height);
  const data = imageData.data;

  // Grayscale + mild gamma/contrast boost to help letters pop.
  const contrast = 1.6;
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;
    gray = 255 * Math.pow(gray / 255, 0.85); // gamma
    gray = factor * (gray - 128) + 128; // contrast
    const v = clamp(gray);
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

async function blobToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const img = new Image();
  const url = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

function normalizeTokens(text: string): string[] {
  const rawTokens = text
    .split(/\s+/)
    .map((t) => t.trim().toUpperCase())
    .filter((t) => t.length >= MIN_TOKEN_LENGTH);

  const cleaned = rawTokens
    .map((t) => t.replace(/[^A-Z0-9-]/g, ""))
    .filter((t) => t.length >= MIN_TOKEN_LENGTH && /[A-Z0-9]/.test(t));

  const unique = Array.from(new Set(cleaned));
  return unique;
}

function expandConfusions(tokens: string[]): string[] {
  const variants = new Set<string>();
  tokens.forEach((token) => {
    variants.add(token);
    CONFUSION_GROUPS.forEach((group) => {
      group.forEach((from) => {
        group.forEach((to) => {
          if (from === to) return;
          const candidate = token.replace(new RegExp(from, "g"), to);
          variants.add(candidate);
        });
      });
    });
  });
  return Array.from(variants);
}

async function runOcrPass(canvas: HTMLCanvasElement, psm: PSM) {
  const worker = await createWorker("eng", 1, { logger: () => {} });
  try {
    await worker.setParameters({
      tessedit_char_whitelist: CHAR_WHITELIST,
      tessedit_pageseg_mode: psm,
    });
    const { data } = await worker.recognize(canvas);
    return data.text || "";
  } finally {
    await worker.terminate();
  }
}

export async function scanPartNumbersFromBlob(blob: Blob): Promise<string[]> {
  const baseCanvas = await blobToCanvas(blob);
  const canvas = preprocessCanvas(baseCanvas);

  // Two passes: sparse text and single block to capture different layouts.
  const [passA, passB] = await Promise.all([
    runOcrPass(canvas, PSM.SPARSE_TEXT),
    runOcrPass(canvas, PSM.SINGLE_BLOCK),
  ]);

  const tokens = normalizeTokens(`${passA}\n${passB}`);
  const expanded = expandConfusions(tokens);
  // Keep deterministic order: longest first helps show likely part numbers.
  return expanded.sort((a, b) => b.length - a.length || a.localeCompare(b));
}

export async function scanPartNumbersFromCanvas(canvas: HTMLCanvasElement): Promise<string[]> {
  const processed = preprocessCanvas(canvas);
  const [passA, passB] = await Promise.all([
    runOcrPass(processed, PSM.SPARSE_TEXT),
    runOcrPass(processed, PSM.SINGLE_BLOCK),
  ]);
  const tokens = normalizeTokens(`${passA}\n${passB}`);
  const expanded = expandConfusions(tokens);
  return expanded.sort((a, b) => b.length - a.length || a.localeCompare(b));
}
