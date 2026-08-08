import { openSync, readSync, closeSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseBambuGcodeHeader } from "../app/lib/gcode/parseBambuGcode";
import {
  extractFromGcodeUpload,
  parseSliceInfoConfig,
} from "../app/lib/gcode/loadFromArchive";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function nearlyEqual(a: number, b: number, eps = 0.02) {
  return Math.abs(a - b) <= eps;
}

function readFilePrefix(path: string, bytes: number): string {
  const fd = openSync(path, "r");
  try {
    const buffer = Buffer.alloc(bytes);
    const read = readSync(fd, buffer, 0, bytes, 0);
    return buffer.subarray(0, read).toString("utf8");
  } finally {
    closeSync(fd);
  }
}

const sampleDir = join(process.cwd(), "sample/fixtures/Metadata");

const headerText = readFilePrefix(join(sampleDir, "plate_1.gcode"), 64 * 1024);
const parsed = parseBambuGcodeHeader(headerText, "Metadata/plate_1.gcode");

assert(
  parsed.filaments.length === 2,
  `expected 2 filaments, got ${parsed.filaments.length}`,
);
assert(
  nearlyEqual(parsed.filaments[0]!.grams, 106.98),
  `f1 ${parsed.filaments[0]?.grams}`,
);
assert(
  nearlyEqual(parsed.filaments[1]!.grams, 7.68),
  `f2 ${parsed.filaments[1]?.grams}`,
);
assert(parsed.filaments[0]!.slot === 1, `slot1 ${parsed.filaments[0]?.slot}`);
assert(parsed.filaments[1]!.slot === 3, `slot3 ${parsed.filaments[1]?.slot}`);
assert(parsed.filaments[0]!.type === "PETG", `type1 ${parsed.filaments[0]?.type}`);
assert(parsed.filaments[1]!.type === "PETG", `type3 ${parsed.filaments[1]?.type}`);
// 9h 43m 14s → 583 minutes (14s rounds to 0)
assert(parsed.totalMinutes === 583, `minutes ${parsed.totalMinutes}`);

const xml = readFileSync(join(sampleDir, "slice_info.config"), "utf8");
const fromXml = parseSliceInfoConfig(xml, "Metadata/slice_info.config");
assert(fromXml.filaments.length === 2, `xml filaments ${fromXml.filaments.length}`);
assert(
  nearlyEqual(fromXml.filaments[0]!.grams, 106.98),
  `xml f1 ${fromXml.filaments[0]?.grams}`,
);
assert(
  nearlyEqual(fromXml.filaments[1]!.grams, 7.68),
  `xml f2 ${fromXml.filaments[1]?.grams}`,
);
assert(fromXml.totalMinutes === 583, `xml minutes ${fromXml.totalMinutes}`);

const minimal = parseBambuGcodeHeader(`
; HEADER_BLOCK_START
; model printing time: 2h 45m 0s; total estimated time: 2h 51m 0s
; total filament weight [g] : 28.40
; filament: 4
; HEADER_BLOCK_END
`);
assert(nearlyEqual(minimal.filaments[0]!.grams, 28.4), `min grams`);
assert(minimal.filaments[0]!.slot === 4, `min slot`);
assert(minimal.totalMinutes === 171, `min time ${minimal.totalMinutes}`);

// Full archive path (renamed .zip or .gcode.3mf) — uses slice_info when present
const zipBuf = readFileSync(join(process.cwd(), "sample/fixtures/sample-1.gcode.3mf.zip"));
const zipFile = new File([zipBuf], "sample-1.gcode.3mf", {
  type: "application/zip",
});
const fromZip = await extractFromGcodeUpload(zipFile);
assert(fromZip.filaments.length === 2, `zip filaments ${fromZip.filaments.length}`);
assert(
  nearlyEqual(fromZip.filaments[0]!.grams, 106.98),
  `zip f1 ${fromZip.filaments[0]?.grams}`,
);
assert(
  nearlyEqual(fromZip.filaments[1]!.grams, 7.68),
  `zip f2 ${fromZip.filaments[1]?.grams}`,
);
assert(fromZip.totalMinutes === 583, `zip minutes ${fromZip.totalMinutes}`);
assert(fromZip.plates.length >= 1, `zip plates ${fromZip.plates.length}`);
assert(fromZip.plates[0]!.sliced, "plate 1 should be sliced");
assert(
  fromZip.metadataSnapshot.slicedPlateCount >= 1,
  "metadata snapshot missing sliced plates",
);

console.log("G-code / 3MF fixture checks passed.");
console.log({
  gcode: parsed.filaments.map((f) => ({
    slot: f.slot,
    grams: f.grams,
    type: f.type,
  })),
  minutes: parsed.totalMinutes,
  zipSource: fromZip.sourceName,
});
