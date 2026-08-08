export type ParsedSlicerResult = {
  filamentGrams: number[];
  totalMinutes: number | null;
  warnings: string[];
  rawHints: {
    foundGramValues: number[];
    foundTimeLabel: string | null;
  };
};

/**
 * Infer per-filament total grams from OCR text of a Bambu/Orca "Slicing Result" panel.
 */
export function parseSlicerResult(ocrText: string): ParsedSlicerResult {
  const warnings: string[] = [];
  const text = normalizeOcrText(ocrText);

  const { minutes: totalMinutes, label: foundTimeLabel } =
    parseDurationToMinutes(text);
  if (totalMinutes == null) {
    warnings.push(
      "Could not read print time from the screenshot. Enter hours and minutes manually.",
    );
  }

  const pairs = extractMeterGramPairs(text);
  const allGrams = extractAllGrams(text);
  let filamentGrams: number[] = [];

  const rowTotals = extractRowTotals(pairs);
  if (rowTotals.length > 0) {
    filamentGrams = dropSummaryTotal(rowTotals);
  } else if (pairs.length === 1) {
    filamentGrams = [pairs[0]!];
  } else if (pairs.length > 1) {
    const totals: number[] = [];
    for (let i = 0; i < pairs.length; i++) {
      const current = pairs[i]!;
      const next = pairs[i + 1];
      if (next == null || next < current * 0.25 || next < current - 20) {
        const window = pairs.slice(Math.max(0, i - 4), i + 1);
        const maxInWindow = Math.max(...window);
        if (current === maxInWindow) totals.push(current);
      }
    }
    filamentGrams = dropSummaryTotal(
      totals.length > 0 ? totals : [Math.max(...pairs)],
    );
  } else if (allGrams.length > 0) {
    filamentGrams = pickFilamentGramsFromList(allGrams, warnings);
  }

  if (filamentGrams.length === 0) {
    warnings.push(
      "Could not read filament weight from the screenshot. Enter grams manually.",
    );
  }

  filamentGrams = filamentGrams.map((g) => Math.round(g * 100) / 100);

  return {
    filamentGrams,
    totalMinutes,
    warnings,
    rawHints: {
      foundGramValues: allGrams,
      foundTimeLabel,
    },
  };
}

export function minutesToHoursMinutes(totalMinutes: number): {
  hours: number;
  minutes: number;
} {
  const safe = Math.max(0, Math.round(totalMinutes));
  return {
    hours: Math.floor(safe / 60),
    minutes: safe % 60,
  };
}

/** Fix common Tesseract misses on dark slicer UIs (lost decimal points). */
export function normalizeOcrText(ocrText: string): string {
  let text = ocrText.replace(/\u00a0/g, " ");

  // Integer gram tokens: 3023g → 30.23 g
  text = text.replace(/(?<![\d.])(\d{3,7})\s*g\b/gi, (_full, digits: string) => {
    return `${recoverFixedPoint(digits)} g`;
  });

  // On lines that already contain a "g" unit, recover bare integers as grams too
  // (Tesseract often drops "g" on some columns: "93429 821g 2299 103929")
  text = text
    .split("\n")
    .map((line) => {
      if (!/\d(?:\.\d+)?\s*g\b/i.test(line)) return line;
      return line.replace(
        /(?<![\d.])(\d{3,7})(?!\.|\d)(?!\s*[mh])/gi,
        (_full, digits: string) => `${recoverFixedPoint(digits)} g`,
      );
    })
    .join("\n");

  // Meter + gram with an explicit g (required so we don't swallow the next "m")
  text = text.replace(
    /(?<![\d.])(\d{2,6})\s*m\s*[\/|]?\s*(\d{2,7})\s*g\b/gi,
    (_full, meters: string, grams: string) => {
      return `${recoverFixedPoint(meters)} m / ${recoverFixedPoint(grams)} g`;
    },
  );

  // Meter + bare integer on the same line (e.g. "952m 28409") — complete token, not another meter
  text = text.replace(
    /(?<![\d.])(\d{2,6})\s*m\s+(\d{3,7})\b(?!\s*m)/gi,
    (_full, meters: string, grams: string) => {
      return `${recoverFixedPoint(meters)} m / ${recoverFixedPoint(grams)} g`;
    },
  );

  // Standalone lost-dot meters (for multi-line tables)
  text = text.replace(/(?<![\d.])(\d{3,6})\s*m\b/gi, (_full, meters: string) => {
    return `${recoverFixedPoint(meters)} m`;
  });

  return text;
}

/**
 * Slicer UI always shows two decimal places. When OCR drops the dot,
 * re-insert it: 3023 → 30.23, 553 → 5.53, 10392 → 103.92, 103929 → 103.92.
 */
export function recoverFixedPoint(
  rawDigits: string,
  opts?: { maxReasonable?: number },
): number {
  const maxReasonable = opts?.maxReasonable ?? 2000;
  const cleaned = rawDigits.replace(/\D/g, "");
  if (!cleaned) return 0;
  if (rawDigits.includes(".")) {
    return Number(rawDigits);
  }

  const candidates: number[] = [];

  if (cleaned.length >= 6) {
    candidates.push(Number(cleaned.slice(0, 5)) / 100);
    candidates.push(Number(cleaned.slice(0, 6)) / 100);
  } else if (cleaned.length === 5) {
    candidates.push(Number(cleaned) / 100);
    candidates.push(Number(cleaned.slice(0, 4)) / 100);
  } else if (cleaned.length >= 3) {
    candidates.push(Number(cleaned) / 100);
  } else {
    candidates.push(Number(cleaned));
  }

  const viable = candidates.filter(
    (n) => Number.isFinite(n) && n > 0 && n <= maxReasonable,
  );
  if (viable.length === 0) return Number(cleaned) / 100;

  // Prefer the candidate closest to a typical 2-decimal slicer reading
  // without exceeding maxReasonable — pick the largest viable under the cap
  // when multiple exist from trimming noise (e.g. 28409 → 28.40 over 284.09).
  if (cleaned.length === 5) {
    const full = Number(cleaned) / 100;
    const trimmed = Number(cleaned.slice(0, 4)) / 100;
    if (full > 200 && trimmed <= 200) return trimmed;
    return full;
  }

  return viable[0]!;
}

function parseDurationToMinutes(text: string): {
  minutes: number | null;
  label: string | null;
} {
  const normalized = text.replace(/\s+/g, " ");

  const labeledPatterns: Array<{ label: string; re: RegExp }> = [
    {
      label: "Total time",
      re: /total\s*time\s*[:：]?\s*((?:\d+\s*h)?\s*(?:\d+\s*m)?\s*(?:\d+\s*s)?)/i,
    },
    {
      label: "Model printing time",
      re: /model\s*printing\s*time\s*[:：]?\s*((?:\d+\s*h)?\s*(?:\d+\s*m)?\s*(?:\d+\s*s)?)/i,
    },
  ];

  for (const { label, re } of labeledPatterns) {
    const match = normalized.match(re);
    if (!match?.[1]) continue;
    const minutes = durationChunkToMinutes(match[1]);
    if (minutes != null && minutes > 0) {
      return { minutes, label };
    }
  }

  const loose = normalized.match(
    /(?:^|\s)((?:\d+\s*h)\s*(?:\d+\s*m)?|(?:\d+\s*h)?\s*(?:\d+\s*m))(?:\s|$)/i,
  );
  if (loose?.[1]) {
    const minutes = durationChunkToMinutes(loose[1]);
    if (minutes != null && minutes > 0) {
      return { minutes, label: "duration" };
    }
  }

  return { minutes: null, label: null };
}

function durationChunkToMinutes(chunk: string): number | null {
  const cleaned = chunk.trim().toLowerCase();
  if (!cleaned) return null;

  const hours = Number(cleaned.match(/(\d+)\s*h/)?.[1] ?? 0);
  const minutes = Number(cleaned.match(/(\d+)\s*m/)?.[1] ?? 0);
  const seconds = Number(cleaned.match(/(\d+)\s*s/)?.[1] ?? 0);

  if (hours === 0 && minutes === 0 && seconds === 0) return null;
  return hours * 60 + minutes + Math.round(seconds / 60);
}

const GRAM_RE = /(\d+(?:\.\d+)?)\s*g\b/gi;
const METER_GRAM_PAIR_RE =
  /(\d+(?:\.\d+)?)\s*m[ \t]*[\/|]?[ \t]+(\d+(?:\.\d+)?)\s*g\b/gi;

function extractMeterGramPairs(text: string): number[] {
  const grams: number[] = [];
  for (const match of text.matchAll(METER_GRAM_PAIR_RE)) {
    const value = Number(match[2]);
    if (Number.isFinite(value) && value > 0) grams.push(value);
  }

  // Multi-line tables: meters on one line, grams on the next
  if (grams.length === 0) {
    grams.push(...extractAlignedMeterGramRows(text));
  }

  return grams;
}

function extractAlignedMeterGramRows(text: string): number[] {
  const lines = text.split(/\n+/);
  const grams: number[] = [];

  for (let i = 0; i < lines.length - 1; i++) {
    const meterLine = lines[i]!;
    const gramLine = lines[i + 1]!;
    const meters = [...meterLine.matchAll(/(?<![\d.])(\d+(?:\.\d+)?)\s*m\b/gi)].map(
      (m) => Number(m[1]),
    );
    const gramValues = [
      ...gramLine.matchAll(/(?<![\d.])(\d+(?:\.\d+)?)\s*g\b/gi),
    ].map((m) => Number(m[1]));

    if (meters.length >= 1 && gramValues.length === meters.length) {
      grams.push(...gramValues);
    }
  }

  return grams;
}

function extractAllGrams(text: string): number[] {
  const grams: number[] = [];
  for (const match of text.matchAll(GRAM_RE)) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > 0 && value < 5000) grams.push(value);
  }
  return grams;
}

function pickFilamentGramsFromList(
  allGrams: number[],
  warnings: string[],
): number[] {
  if (allGrams.length === 1) return [allGrams[0]!];

  // Full filament tables often OCR as flat lists of 4 cells per row
  for (const stride of [5, 4]) {
    if (allGrams.length >= stride * 2 && allGrams.length % stride === 0) {
      const totals: number[] = [];
      for (let i = stride - 1; i < allGrams.length; i += stride) {
        totals.push(allGrams[i]!);
      }
      return dropSummaryTotal(totals);
    }
  }

  // 3 filament rows × 4 cols = 12, but summary truncated — try 8 (2 filaments)
  if (allGrams.length >= 8) {
    const firstTwo = [
      allGrams[3]!,
      allGrams[7]!,
    ];
    if (firstTwo.every((g) => g > 0)) {
      return firstTwo;
    }
  }

  const withoutSummary = dropSummaryTotal(
    dedupeNear(
      allGrams.filter((g) => g >= 0.5),
      0.02,
    ),
  );

  if (withoutSummary.length > 4) {
    const largest = Math.max(...allGrams);
    warnings.push(
      "Multiple gram values found; used the largest. Check each filament row.",
    );
    return [largest];
  }

  return withoutSummary.length > 0
    ? withoutSummary
    : [Math.max(...allGrams)];
}

function extractRowTotals(pairs: number[]): number[] {
  if (pairs.length === 0) return [];

  for (const stride of [5, 4, 3]) {
    if (pairs.length >= stride && pairs.length % stride === 0) {
      const totals: number[] = [];
      for (let i = stride - 1; i < pairs.length; i += stride) {
        totals.push(pairs[i]!);
      }
      return totals;
    }
  }

  return [];
}

function dropSummaryTotal(totals: number[]): number[] {
  if (totals.length < 2) return totals;
  const last = totals[totals.length - 1]!;
  const priorSum = totals.slice(0, -1).reduce((sum, g) => sum + g, 0);
  if (Math.abs(last - priorSum) < 0.51) {
    return totals.slice(0, -1);
  }
  // OCR often corrupts the summary total while filament rows are intact
  if (totals.length >= 3 && priorSum > last * 2) {
    return totals.slice(0, -1);
  }
  return totals;
}

function dedupeNear(values: number[], toleranceRatio: number): number[] {
  const result: number[] = [];
  for (const value of values) {
    const exists = result.some(
      (existing) =>
        Math.abs(existing - value) <=
        Math.max(0.05, existing * toleranceRatio),
    );
    if (!exists) result.push(value);
  }
  return result;
}
