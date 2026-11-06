"use client";

import { useMemo, useState } from "react";
import type { ExtractField, GroundingResponse } from "@/lib/clocked";
import { SAMPLE_DATASHEET, SAMPLE_NOTES } from "@/lib/sample";

type Result = {
  specs: Record<string, ExtractField> | null;
  specsError: string | null;
  verify: GroundingResponse | null;
  verifyError: string | null;
};

type Highlight = { start: number; end: number } | null;

const SPEC_LABELS: Record<string, string> = {
  part_number: "Part",
  recommended_max_input: "Max input (recommended)",
  absolute_max_input: "Max input (absolute)",
  rated_current: "Rated current",
  dropout_or_headroom: "Dropout at full load",
  temperature_range: "Temperature range",
  packages: "Packages",
  required_capacitor: "Required capacitor",
};

const VERDICT: Record<string, { label: string; tone: string }> = {
  supported: { label: "Matches datasheet", tone: "ok" },
  contradicted: { label: "Conflicts with datasheet", tone: "bad" },
  not_stated: { label: "Datasheet does not say", tone: "warn" },
  not_a_claim: { label: "Not a spec claim", tone: "muted" },
};

const LOW_CONFIDENCE = 0.6;

export default function Home() {
  const [datasheet, setDatasheet] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [checkedText, setCheckedText] = useState("");
  const [highlight, setHighlight] = useState<Highlight>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    setHighlight(null);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasheet, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The check failed.");
      setCheckedText(datasheet);
      setResult(data as Result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const claims = useMemo(
    () => (result?.verify?.claims ?? []).filter((c) => c.verdict !== "not_a_claim"),
    [result],
  );
  const conflicts = claims.filter((c) => c.verdict === "contradicted").length;
  const unknown = claims.filter((c) => c.verdict === "not_stated").length;

  return (
    <main>
      <header className="top">
        <div>
          <h1>Datasheet Check</h1>
          <p className="lede">
            Paste a part&apos;s datasheet and your design notes. It pulls the limits that matter out of the datasheet and
            checks every claim in your design against them, with the exact line as proof.
          </p>
        </div>
        <button
          className="ghost"
          onClick={() => {
            setDatasheet(SAMPLE_DATASHEET);
            setNotes(SAMPLE_NOTES);
          }}
        >
          Load LM1117 example
        </button>
      </header>

      <section className="inputs">
        <label>
          <span>Datasheet text</span>
          <textarea
            value={datasheet}
            onChange={(e) => setDatasheet(e.target.value)}
            placeholder="Paste the features, absolute maximum ratings, recommended operating conditions and electrical characteristics."
            rows={14}
          />
        </label>
        <label>
          <span>Design notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How the part is used on your board: rails, loads, temperatures, packages, passives."
            rows={14}
          />
        </label>
      </section>

      <div className="actions">
        <button className="primary" onClick={run} disabled={loading || !datasheet.trim() || !notes.trim()}>
          {loading ? "Checking..." : "Check design"}
        </button>
        {error && <p className="error">{error}</p>}
      </div>

      {result && (
        <>
          {result.verify && (
            <div className={`summary ${conflicts ? "bad" : "ok"}`}>
              <strong>
                {conflicts
                  ? `${conflicts} of ${claims.length} design claims conflict with the datasheet`
                  : `No conflicts found in ${claims.length} design claims`}
              </strong>
              {unknown > 0 && <span> · {unknown} the datasheet does not settle</span>}
            </div>
          )}

          <section className="results">
            <div className="panel">
              <h2>What the datasheet says</h2>
              <p className="sub">Clocked Extract · values copied verbatim, click one to see where it came from</p>
              {result.specsError && <p className="error">{result.specsError}</p>}
              {result.specs && (
                <table>
                  <tbody>
                    {Object.entries(SPEC_LABELS).map(([key, label]) => (
                      <SpecRow key={key} label={label} field={result.specs?.[key]} onPick={setHighlight} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="panel">
              <h2>Does the design hold up?</h2>
              <p className="sub">Clocked Verify · each claim judged against the datasheet only</p>
              {result.verifyError && <p className="error">{result.verifyError}</p>}
              <ol className="claims">
                {claims.map((c, i) => {
                  const v = VERDICT[c.verdict] ?? { label: c.verdict, tone: "muted" };
                  const p = c.verdict === "contradicted" ? c.contradicted : c.verdict === "supported" ? c.supported : c.not_stated;
                  return (
                    <li
                      key={i}
                      className={`claim ${v.tone} ${c.evidence ? "clickable" : ""}`}
                      onClick={() => c.evidence && setHighlight({ start: c.evidence.start, end: c.evidence.end })}
                    >
                      <div className="claim-head">
                        <span className={`chip ${v.tone}`}>{v.label}</span>
                        <span className="prob">{Math.round(p * 100)}%</span>
                      </div>
                      <p className="claim-text">{c.claim}</p>
                      {c.evidence ? (
                        <blockquote>{c.evidence.quote}</blockquote>
                      ) : (
                        <p className="none">No supporting line in the datasheet.</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>

          <section className="panel source">
            <h2>Datasheet source</h2>
            <SourceView text={checkedText} highlight={highlight} />
          </section>
        </>
      )}

      <footer>
        Built on the Clocked API (Extract and Verify). It reads only the text you paste: a claim the datasheet does not
        cover is reported as not stated, never guessed.
      </footer>
    </main>
  );
}

function SpecRow({
  label,
  field,
  onPick,
}: {
  label: string;
  field: ExtractField | undefined;
  onPick: (h: Highlight) => void;
}) {
  if (!field || field.value === null || (Array.isArray(field.value) && field.value.length === 0)) {
    return (
      <tr className="missing">
        <th>{label}</th>
        <td>Not stated in this datasheet</td>
      </tr>
    );
  }
  const spans = Array.isArray(field.value)
    ? (field.items ?? []).filter(
        (s, i, all) => s.start !== undefined && all.findIndex((o) => o.value === s.value) === i,
      )
    : [{ value: field.value, start: field.start, end: field.end, confidence: field.confidence }];
  return (
    <tr>
      <th>{label}</th>
      <td>
        {spans.map((s, i) => (
          <button
            key={i}
            className={`value ${(s.confidence ?? 1) < LOW_CONFIDENCE ? "low" : ""}`}
            onClick={() => s.start !== undefined && s.end !== undefined && onPick({ start: s.start, end: s.end })}
            title={`confidence ${Math.round((s.confidence ?? 0) * 100)}%`}
          >
            {s.value}
            {(s.confidence ?? 1) < LOW_CONFIDENCE && <em> check</em>}
          </button>
        ))}
      </td>
    </tr>
  );
}

function SourceView({ text, highlight }: { text: string; highlight: Highlight }) {
  // Offsets from Clocked are Unicode code points; Array.from keeps them aligned with surrogate pairs.
  const chars = Array.from(text);
  if (!highlight) return <pre>{text}</pre>;
  return (
    <pre>
      {chars.slice(0, highlight.start).join("")}
      <mark ref={(el) => el?.scrollIntoView({ block: "center", behavior: "smooth" })}>
        {chars.slice(highlight.start, highlight.end).join("")}
      </mark>
      {chars.slice(highlight.end).join("")}
    </pre>
  );
}
