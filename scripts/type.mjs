// Text as outlines. Every word on the cards and the hero is drawn as an SVG path from
// GitHub's own typefaces (Mona Sans and Monaspace Neon, both SIL OFL, in assets/fonts), so
// nothing depends on what a viewer has installed and the type looks the same in a browser,
// on a phone and in an email.
import opentype from 'opentype.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'fonts');

const FILES = {
  text: 'MonaSans-Regular.ttf', //    Mona Sans: GitHub's own typeface, for body text
  medium: 'MonaSans-Medium.ttf',
  semibold: 'MonaSans-SemiBold.ttf', // names, labels
  bold: 'MonaSans-Bold.ttf', //          headlines
  mono: 'MonaspaceNeon-500.ttf', //      Monaspace Neon: GitHub's code font, for hashes, handles, counts
  monoBold: 'MonaspaceNeon-700.ttf',
};

const cache = new Map();
const font = (key) => {
  if (!cache.has(key)) {
    if (!FILES[key]) throw new Error(`unknown font "${key}"`);
    cache.set(key, opentype.loadSync(path.join(dir, FILES[key])));
  }
  return cache.get(key);
};

/** Advance width of a line of text, in px. `tracking` is letter-spacing in em. */
export const measure = (key, text, size, tracking = 0) =>
  font(key).getAdvanceWidth(text, size, { kerning: true, letterSpacing: tracking });

/** One line of text as an SVG path `d` string, with its baseline at y. anchor: start | middle | end. */
export function line(key, text, x, y, size, { tracking = 0, anchor = 'start' } = {}) {
  const w = measure(key, text, size, tracking);
  const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  const d = font(key).getPath(text, x0, y, size, { kerning: true, letterSpacing: tracking }).toPathData(size > 60 ? 2 : 1);
  return { d, width: w, x: x0 };
}

/** The largest size at which `text` is no wider than `width`. */
export const fitSize = (key, text, width, tracking = 0) => (width / measure(key, text, 100, tracking)) * 100;

/** Greedy word wrap to `width` px; never more than `maxLines` (the last line gets an ellipsis if cut). */
export function wrap(key, text, size, width, maxLines = 99, tracking = 0) {
  const words = String(text).trim().split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && measure(key, next, size, tracking) > width) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1] + ' ' + lines.slice(maxLines).join(' ');
    while (last.length > 1 && measure(key, last + '…', size, tracking) > width) last = last.slice(0, last.lastIndexOf(' ') > 0 ? last.lastIndexOf(' ') : -1);
    kept[maxLines - 1] = last.replace(/[\s,.;:–—-]+$/, '') + '…';
    return kept;
  }
  return lines;
}

/** Several wrapped lines as one path, `lead` px apart, first baseline at y. */
export function block(key, text, x, y, size, width, { lead = size * 1.3, maxLines = 99, tracking = 0 } = {}) {
  const lines = wrap(key, text, size, width, maxLines, tracking);
  const d = lines.map((l, i) => line(key, l, x, y + i * lead, size, { tracking }).d).join('');
  return { d, lines: lines.length, height: lines.length * lead };
}
