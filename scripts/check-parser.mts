import {
  parseSlicerResult,
  recoverFixedPoint,
  normalizeOcrText,
} from "../app/lib/ocr/parseSlicerResult";
import { calculateQuote } from "../app/lib/pricing";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function nearlyEqual(a: number, b: number, eps = 0.05) {
  return Math.abs(a - b) <= eps;
}

assert(nearlyEqual(recoverFixedPoint("3023"), 30.23), "3023");
assert(nearlyEqual(recoverFixedPoint("553"), 5.53), "553");
assert(nearlyEqual(recoverFixedPoint("10392"), 103.92), "10392");
assert(nearlyEqual(recoverFixedPoint("103929"), 103.92), "103929");
assert(nearlyEqual(recoverFixedPoint("28409"), 28.4), "28409");
assert(nearlyEqual(recoverFixedPoint("952"), 9.52), "952");

// Multi-filament Bambu-style OCR (from first screenshot)
const multiFilamentOcr = `
Slicing Result
Color Scheme Filament
Filament Model Purged Tower Total
1 30.58 m / 93.42 g 2.69 m / 8.21 g 0.75 m / 2.29 g 34.02 m / 103.92 g
3 0.82 m / 2.53 g 0.76 m / 2.35 g 0.21 m / 0.65 g 1.80 m / 5.53 g
Total 31.40 m / 95.95 g 3.45 m / 10.56 g 0.96 m / 2.94 g 35.82 m / 109.45 g
Filament change times: 26
Cost: 3.26
Time Estimation
Prepare and timelapse time: 6m44s + 4m6s
Model printing time: 9h11m
Total time: 9h22m
`;

const multiWithSupportOcr = `
Filament Model Support Purge Tower Total
1 30.58 m / 93.42 g 0.00 m / 0.00 g 2.69 m / 8.21 g 0.75 m / 2.29 g 34.02 m / 103.92 g
3 0.82 m / 2.53 g 0.00 m / 0.00 g 0.76 m / 2.35 g 0.21 m / 0.65 g 1.80 m / 5.53 g
Total 31.40 m / 95.95 g 0.00 m / 0.00 g 3.45 m / 10.56 g 0.96 m / 2.94 g 35.82 m / 109.45 g
Total time: 9h22m
`;

const singleFilamentA = `
Slicing Result
Filament Model
4 9.52 m / 28.40 g
Filament change times: 0
Cost: 0.57
Time Estimation
Prepare time: 5m39s
Model printing time: 2h45m
Total time: 2h51m
`;

const singleFilamentB = `
Slicing Result
Filament Model
4 9.52 m / 30.23 g
Filament change times: 0
Cost: 0.76
Prepare time: 5m25s
Model printing time: 2h44m
Total time: 2h50m
`;

// Messy Tesseract output (decimals dropped) — from real screenshot runs
const messySingle = `
Slicing Result
Filament Model
4 952m 3023g
Filament change times: 0
Cost: 0.76
Model printing time: 2h44m
Total time: 2h50m
`;

const messySingleB = `
Slicing Result
Filament Model
m4 952m 28409
Filament change times: 0
Total time: 2h51m
`;

const messyMulti = `
Filament Model Purged Tower Total
m1 3058m 269m 075m 3402m
9342g 821g 229g 10392g
3 082m 076m 021m 180m
253g 235g 065g 553g
Total 3140m 345m 096m 3582m
9595g 1056g 294g 10945g
Total time: 9h22m
`;

const multi = parseSlicerResult(multiFilamentOcr);
assert(multi.totalMinutes === 9 * 60 + 22, `multi time ${multi.totalMinutes}`);
assert(multi.filamentGrams.length === 2, `multi count ${multi.filamentGrams}`);
assert(nearlyEqual(multi.filamentGrams[0]!, 103.92), `f1 ${multi.filamentGrams[0]}`);
assert(nearlyEqual(multi.filamentGrams[1]!, 5.53), `f2 ${multi.filamentGrams[1]}`);

const multiSupport = parseSlicerResult(multiWithSupportOcr);
assert(
  multiSupport.filamentGrams.length === 2 &&
    nearlyEqual(multiSupport.filamentGrams[0]!, 103.92) &&
    nearlyEqual(multiSupport.filamentGrams[1]!, 5.53),
  `support ${multiSupport.filamentGrams}`,
);

const a = parseSlicerResult(singleFilamentA);
assert(a.totalMinutes === 2 * 60 + 51, `A time ${a.totalMinutes}`);
assert(nearlyEqual(a.filamentGrams[0]!, 28.4), `A g ${a.filamentGrams[0]}`);

const b = parseSlicerResult(singleFilamentB);
assert(b.totalMinutes === 2 * 60 + 50, `B time ${b.totalMinutes}`);
assert(nearlyEqual(b.filamentGrams[0]!, 30.23), `B g ${b.filamentGrams[0]}`);

const messy = parseSlicerResult(messySingle);
assert(nearlyEqual(messy.filamentGrams[0]!, 30.23), `messy ${messy.filamentGrams}`);
assert(messy.totalMinutes === 170, `messy time ${messy.totalMinutes}`);

const messyB = parseSlicerResult(messySingleB);
assert(
  nearlyEqual(messyB.filamentGrams[0]!, 28.4),
  `messyB ${normalizeOcrText(messySingleB)} => ${messyB.filamentGrams}`,
);

const messyM = parseSlicerResult(messyMulti);
assert(
  messyM.filamentGrams.length === 2 &&
    nearlyEqual(messyM.filamentGrams[0]!, 103.92) &&
    nearlyEqual(messyM.filamentGrams[1]!, 5.53),
  `messyMulti ${messyM.filamentGrams}`,
);

const quote = calculateQuote({
  filaments: [
    { id: "1", label: "PLA", grams: 100, pricePerKg: 650 },
    { id: "2", label: "PETG", grams: 50, pricePerKg: 800 },
  ],
  printMinutes: 150,
  machineRatePerHour: 50,
  markupPercent: 20,
});
assert(nearlyEqual(quote.materialCost, 105), `material ${quote.materialCost}`);
assert(nearlyEqual(quote.machineCost, 125), `machine ${quote.machineCost}`);
assert(nearlyEqual(quote.total, 276), `total ${quote.total}`);

console.log("All fixture checks passed.");
console.log({
  multi: multi.filamentGrams,
  messy: messy.filamentGrams,
  messyB: messyB.filamentGrams,
  messyM: messyM.filamentGrams,
});
