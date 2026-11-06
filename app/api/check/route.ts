import { NextResponse } from "next/server";
import { clocked, ClockedError, type ExtractResponse, type GroundingResponse } from "@/lib/clocked";

export const maxDuration = 60;

// What an engineer reads off a datasheet before trusting a part in a design.
const SPEC_FIELDS = {
  part_number: { description: "device part number or family name" },
  recommended_max_input: {
    description: "maximum input or supply voltage under recommended operating conditions, with unit",
  },
  absolute_max_input: { description: "absolute maximum input or supply voltage rating, with unit" },
  rated_current: { description: "rated or maximum output current, with unit" },
  dropout_or_headroom: { description: "dropout voltage at full rated current, with unit" },
  temperature_range: {
    description: "operating or junction temperature range of a device grade",
    list: true,
    max_items: 4,
  },
  packages: { description: "package name such as SOT-223 or TO-220", list: true, max_items: 8 },
  required_capacitor: { description: "required external capacitor value and type" },
};

const VERIFY_INSTRUCTIONS =
  "The documents are a component datasheet. The answer is an engineer's design notes about how the part is used on a board. " +
  "Judge each design claim only against the datasheet. Keep absolute maximum ratings apart from recommended operating conditions, " +
  "keep different device grades and temperature ranges apart, and keep typical values apart from guaranteed minimums and maximums. " +
  "A value the datasheet does not give is not stated, not contradicted.";

const MAX_DATASHEET = 60_000;
const MAX_NOTES = 8_000;

export async function POST(req: Request) {
  const { datasheet, notes } = (await req.json().catch(() => ({}))) as { datasheet?: unknown; notes?: unknown };
  if (typeof datasheet !== "string" || !datasheet.trim()) {
    return NextResponse.json({ error: "Paste the datasheet text first." }, { status: 400 });
  }
  if (typeof notes !== "string" || !notes.trim()) {
    return NextResponse.json({ error: "Write the design notes you want checked." }, { status: 400 });
  }
  if (datasheet.length > MAX_DATASHEET || notes.length > MAX_NOTES) {
    return NextResponse.json(
      { error: `Keep the datasheet under ${MAX_DATASHEET} characters and the notes under ${MAX_NOTES}.` },
      { status: 400 },
    );
  }

  // Extract and Verify are independent reads of the same datasheet, so they run together.
  const [specs, verify] = await Promise.allSettled([
    clocked<ExtractResponse>("extract", { text: datasheet, fields: SPEC_FIELDS }),
    clocked<GroundingResponse>("grounding", {
      documents: [{ id: "datasheet", text: datasheet }],
      answer: notes,
      instructions: VERIFY_INSTRUCTIONS,
      evidence: "all",
      threshold: 0.6,
    }),
  ]);

  const failure = (r: PromiseSettledResult<unknown>) =>
    r.status === "rejected" ? (r.reason instanceof ClockedError ? r.reason.message : "Request failed") : null;

  return NextResponse.json({
    specs: specs.status === "fulfilled" ? specs.value.fields : null,
    specsError: failure(specs),
    verify: verify.status === "fulfilled" ? verify.value : null,
    verifyError: failure(verify),
  });
}
