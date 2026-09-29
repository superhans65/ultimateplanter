# Ultimate Planter

Browser-based animal planter designer for [ultimateplanter.com](https://ultimateplanter.com).
The product starts with a configurable cat vessel, live 3D preview, printable
dimension checks, and a path to secure server-generated STL exports.

The source brief is [Animal_Pot_Generator_Requirements.md](./Animal_Pot_Generator_Requirements.md).

## Current milestone

This repository contains the first working product slice:

- responsive public editor shell and Ultimate Planter branding;
- versioned cat parameter model with safe ranges and validation;
- real-millimetre closed vessel geometry, including interior, solid floor,
  rim, and optional through-drain;
- parameterized ears, face, cheeks, and paws in the live preview;
- orbit, zoom, reset, 10 mm grid, and interior cutaway;
- last-valid-preview behavior for invalid settings;
- local draft persistence and JSON design download;
- unit tests for preset validity, identity, bounds, and invalid openings.

The STL action is deliberately marked as the next milestone. The preview
features currently overlap the vessel visually; they must be boolean-unioned
and checked with the Manifold kernel on the server before a paid/public export
is represented as printable.

## Development

Requires Node.js 24 or newer.

\`\`\`sh
npm install
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000).

Checks:

\`\`\`sh
npm run typecheck
npm run lint
npm test
npm run build
\`\`\`

## Shared credits

Ultimate Planter will authenticate against the same Supabase project and
consume the same append-only credit lots as Ultimate Cutter. It must not copy
balances into a second database or let the browser select a price.

The schema and rollout boundary are documented in
[docs/architecture/shared-credits.md](./docs/architecture/shared-credits.md).
The canonical production migration belongs with the existing Cuttr Supabase
migration chain so both products share one ledger contract.

Local environment values will eventually mirror the public Supabase values
used by Ultimate Cutter:

\`\`\`sh
cp .env.example .env.local
\`\`\`

Never expose the Supabase service-role key in a \`NEXT_PUBLIC_*\` variable.

## Next implementation milestones

1. Build the high-resolution integrated mesh with \`manifold-3d\`; add
   topology, thickness, bounding-box, and fixture-matrix checks.
2. Add the shared-platform planter entitlement migration and atomic quote /
   unlock RPC in the canonical Cuttr migration chain.
3. Add Supabase sign-in and read-only balance display here, including
   \`ultimateplanter.com\` auth redirect allow-list entries.
4. Add an authenticated server export endpoint that reads an owned immutable
   design snapshot and produces the STL away from the browser.
5. Slice and physically print the default and safe-range matrix, then record
   calibrated minimums in the requirements.

## License

No public license has been selected yet. The repository being public does not
by itself grant reuse rights; choose and add a license before launch.
