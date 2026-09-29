# Shared identity and credits

Status: initial architecture decision, implementation pending.

## Decision

Ultimate Planter and Ultimate Cutter are separate applications and repositories
but one product account ecosystem. They use the same Supabase Auth project,
user IDs, \`credit_lots\`, and append-only \`credit_transactions\` ledger.

The existing ledger remains the source of truth. Ultimate Planter does not
replicate a balance, mint credits, accept a client-supplied price, or debit a
lot directly.

\`\`\`
Supabase Auth user
       |
       +-- shared credit lots / immutable transaction ledger
       |          |
       |          +-- Ultimate Cutter entitlement RPCs
       |          +-- Ultimate Planter entitlement RPC
       |
       +-- cutter library items
       +-- planter designs
\`\`\`

## Why planter entitlements are separate

Cuttr's current \`library_items\` contract encodes cutter-specific identity,
source artifacts, product values (\`standard\` / \`multi\`), and variants.
Forcing a planter into those values would weaken existing constraints and make
the geometry generators depend on one another.

Add planter-owned records, tentatively:

- \`planter_designs\`: user, deterministic parameter hash, versioned
  parameter snapshot, name, unlock audit fields, timestamps, soft deletion;
- \`planter_design_revisions\` only if post-unlock edits need immutable
  revision history. Otherwise follow Cuttr's current saved-variant approach;
- a server-authoritative \`private.planter_unlock_price_credits()\`;
- a client-callable \`public.unlock_planter_design(...)\` security-definer
  RPC whose subject is always \`auth.uid()\`.

The RPC must perform entitlement insert and FIFO lot consumption in one
database transaction, lock lots in stable order, use a one-attempt idempotency
key, and return the authoritative post-charge balance. Replays return the
existing entitlement without a second debit. Failures roll back both sides.

The ledger reference should identify \`planter_design\` and its record ID.
Any existing \`reference_type\` check constraint must be extended explicitly
rather than overloading a cutter value.

## Migration ownership

The production database has one ordered migration history, currently owned by
the Cuttr repository. The first planter database migration should be developed
and tested there (or after deliberately extracting a shared platform repo), not
independently deployed from both repositories.

This repository may contain client types and contract tests, but must not
become a second competing migration authority.

## Auth across two domains

The same credentials and user ID work on both sites, but browser storage is
origin-scoped. A session held in local storage on \`ultimatecutter.com\` is not
automatically readable by \`ultimateplanter.com\`. Initial launch can ask the
user to sign in on each site with the same account.

Before launch:

1. add production and development Ultimate Planter callback/return URLs to
   Supabase Auth's allowed redirect list;
2. keep OAuth's provider callback on the shared public Supabase host;
3. verify password confirmation and recovery return to the correct product;
4. decide separately whether seamless cross-domain SSO is worth a central
   exchange flow. Do not share auth tokens through query strings.

## Export trust boundary

Free browser preview may use low-cost geometry. Paid STL bytes must be generated
server-side from the saved entitlement snapshot, following Cuttr's established
export boundary:

1. browser validates and uploads/saves the versioned parameter object;
2. atomic unlock RPC persists the entitlement and consumes credits;
3. export route verifies the bearer session and ownership;
4. route reads one consistent design snapshot;
5. a bounded worker builds the high-quality manifold mesh;
6. validation checks closedness, orientation, Z=0, dimensions, feature
   connections, wall/floor minimums, and printer envelope;
7. only the validated STL is returned.

The server must use the same parameter semantics as the preview. Client-side
controls never contain a hidden STL download path for locked designs.

## Price decision still required

The product owner still needs to choose the planter unlock price and whether a
single unlock permanently covers all future edits/exports of that planter.
The recommended starting contract matches Cuttr's transparent approach:
preview for free, quote before confirmation, one permanent design entitlement,
and free re-exports/edits of that owned design. The database—not UI constants—
must remain authoritative.
