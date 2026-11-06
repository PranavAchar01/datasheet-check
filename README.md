# Datasheet Check

Paste a part's datasheet and a few notes on how you use it on your board. Datasheet Check pulls the main limits out of the datasheet and checks each claim in your notes against them, quoting the datasheet line behind every answer.

Built for the Clocked Build Challenge on the [Clocked API](https://clocked.rezolve.ai/docs).

## How it uses Clocked

One request to `/api/check` runs two Clocked endpoints in parallel over the same datasheet text:

- Extract (`/clocked/extract`) reads the spec card: part number, recommended and absolute maximum input voltage, rated current, dropout, temperature ranges per grade, packages and the required output capacitor. Every value is copied verbatim with its character offsets, so clicking a value highlights it in the datasheet. A value the datasheet does not state comes back null and the app shows "Not stated". Values under 60% confidence are marked "check".
- Verify (`/clocked/grounding`) splits the design notes into claims and judges each one against the datasheet only: matches, conflicts, or not stated, with the quote that decided it. The instructions tell it to keep absolute maximum ratings apart from recommended operating conditions and to keep device grades apart, since those are easy to mix up when reading a datasheet.

Extract shows what the part can do, and Verify shows where your design assumes something else.

Failures are handled per endpoint: if one call fails, the other result still shows, with the error in its panel. Each call has one idempotency key that is reused on a retry, as the Clocked docs require.

## Example

The "Load LM1117 example" button loads an excerpt of the public TI LM1117 datasheet ([SNOS412Q](https://www.ti.com/lit/ds/symlink/lm1117.pdf)) and design notes with three mistakes in them: an 18 V input surge (recommended maximum is 15 V), a -30 °C environment for the standard LM1117 grade, which is rated from 0 °C, and a 1 µF ceramic output capacitor where the datasheet requires at least 10 µF tantalum. All three come back as conflicts with the matching datasheet line.

## Run it

```bash
pnpm install
cp .env.example .env.local   # add your CLOCKED_API_KEY
pnpm dev
```

Open http://localhost:3000. Deploys to Vercel as is; set `CLOCKED_API_KEY` as an environment variable.

## Stack

Next.js 15 (App Router), TypeScript, one API route, no database. The API key stays on the server.

## License

MIT
