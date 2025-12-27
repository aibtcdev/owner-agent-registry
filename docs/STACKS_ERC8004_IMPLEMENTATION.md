# Stacks ERC-8004 Implementation Plan

## Revised Purpose of the Repo

**Core Goal**: Implement **ERC-8004 Stacks Edition** as a **chain singleton** (one deployment per Stacks network: mainnet/testnet), fully compatible with the multichain agent ID namespace (`stacks:<chainId>:<registry>:<agentId>`). This positions Stacks alongside Ethereum (Solidity) and Solana (Rust) as a first-class ERC-8004 chain. No distractions like custom wallets (`agent-account-example`), owner-agent mappings (`owner-agent-registry`), or stubs (`registry-addon-attestation`)—pure spec compliance for **Identity**, **Reputation**, and **Validation Registries**.

- **Why?** ERC-8004 docs emphasize per-chain singletons for discovery/trust. Stacks agents get portable IDs, reputation/validation signals. Off-chain indexers/subgraphs crawl via events/URIs.
- **Repo Name**: Rename to `erc8004-stacks-contracts` (or `erc8004-contracts-stacks`) to mirror `erc8004-contracts` (Solidity).
- **Output**: Testnet deployments + README with addresses (like Solidity README). Live demo agents/feedback.

**Key Adaptations for Clarity/Stacks**:

- **No ERC-721**: Use sequential `agentId` (u64, incremental via data-var), maps for ownership/URI/metadata. Events for indexing.
- **Signatures**: Flexible verification—**signed message** (Clarity `secp256k1-recover-public-key` on EIP-191-style hash) **or public function call** (agent pre-calls to authorize). STX txs are cheap/fast, so both viable. Follow Clarity conventions (e.g., `print` events, `string-utf8`, `buff` hashes).
- **Permissions**: Owner/operator via principal maps (like `isApprovedForAll`).
- **Storage**: Maps mirror Solidity (e.g., `agentId => client => index => Feedback`).
- **Events**: `print` structured payloads for indexing (e.g., `NewFeedback`).
- **Testing**: **100% coverage** with Clarinet/Vitest.

## High-Level Plan

**Status**: `identity-registry.clar` ✅ Implemented & Tested.

1. **Three Contracts** (modular, each refs `identity-registry` via traits/cross-calls):
   | Contract | Status | Purpose | Key Maps/Functions |
   |----------|--------|---------|--------------------|
   | `identity-registry.clar` | ✅ Done | Agent registration (ERC-721 equiv.) | `owners: {agent-id: uint} → principal`, `uris: {agent-id: uint} → (string-utf8 512)`, `metadata: {agent-id: uint, key: (string-utf8 128)} → (buff 512)`, `approvals: {agent-id: uint, operator: principal} → bool`<br>`register() → uint`, `register-with-uri((string-utf8 512)) → uint`, `register-full((string-utf8 512), (list 10 {key: (string-utf8 128), value: (buff 512)})) → uint agentId`, `owner-of(uint) → (optional principal)`, `get-uri(uint) → (optional (string-utf8 512))`, `set-agent-uri(uint, (string-utf8 512)) → (response bool uint)`, `set-metadata(uint, (string-utf8 128), (buff 512)) → (response bool uint)`, `set-approval-for-all(uint, principal, bool) → (response bool uint)`, `is-approved-for-all(uint, principal) → bool`, `get-version() → (string-utf8 8)` |
   | `reputation-registry.clar` | ⏳ Next | Feedback (score/tags/revoke/response) | `_feedback: {agent-id: uint, client: principal, index: uint} → {score: uint, tag1: (buff 32), tag2: (buff 32), is-revoked: bool}`, `_last-index: {agent-id: uint, client: principal} → uint`, `_clients: {agent-id: uint} → (list 1024 principal)`<br>`give-feedback(uint agentId, uint score, (buff 32) tag1, (buff 32) tag2, (string-utf8 512) feedback-uri, (buff 32) feedback-hash, (buff 65) auth) → (response bool uint)`, `revoke-feedback(uint agentId, uint index) → (response bool uint)`, `append-response(uint agentId, principal client, uint index, (string-utf8 512) response-uri, (buff 32) response-hash) → (response bool uint)`, `get-summary(uint agentId, (optional (list 200 principal)), (optional (buff 32)), (optional (buff 32))) → {count: uint, average-score: uint}`, `read-all-feedback(...) → ...` (paginated) |
   | `validation-registry.clar` | ⏳ Next | Validator requests/responses | `_validations: (buff 32) → {validator: principal, agent-id: uint, response: uint, response-hash: (buff 32), tag: (buff 32), last-update: uint}`, `_agent-validations: {agent-id: uint} → (list 1024 (buff 32))`<br>`validation-request(principal validator, uint agentId, (string-utf8 512) request-uri, (buff 32) request-hash) → (response bool uint)` (owner/approved only), `validation-response((buff 32) request-hash, uint response, (string-utf8 512) response-uri, (buff 32) response-hash, (buff 32) tag) → (response bool uint)` (validator only), `get-summary(uint agentId, (optional (list 200 principal)), (optional (buff 32))) → {count: uint, avg-response: uint}` |

2. **Deployment**:

   - **Testnet First**: Hiro Testnet (chainId via `chain-id`).
   - Singleton: Owner multisig/timelock post-deploy (no upgrades needed).
   - Clarinet deploy scripts + `settings/Devnet.toml` / `settings/Testnet.toml`.

3. **Multichain ID**: `stacks:<chainId>:<identityRegistry>:<agentId>` in agent JSON `registrations[]`. Per CAIP-2: Mainnet `stacks:1`, Testnet `stacks:2147483648`.

4. **Gas/Storage Learnings**: Fixed `string-utf8 512`/`buff 512`, `list 10` batch limits, `fold` for batch inserts (atomic), paginated reads (e.g., `list 10` per page), `uint` everywhere (no `u64`—Clarity `uint` is fine).

## Next Steps (Prioritized, 1-2 Days Each)

**Completed**:
- ✅ `identity-registry.clar` implemented (sequential IDs from 0, batch register-full w/ fold, approvals, metadata/URI updates, events via `print`, version).
- ✅ `tests/identity-registry.test.ts` (full coverage: register variants, auth checks, reads).

**Remaining**:

1. **Reputation Registry** (1-2 days):
   - Implement `contracts/reputation-registry.clar` mirroring Solidity:
     - Maps: `feedback {agent-id: uint, client: principal, index: uint} → {score: uint, tag1: (buff 32), tag2: (buff 32), is-revoked: bool}`, `last-index {agent-id: uint, client: principal} → uint`, `clients {agent-id: uint} → (list 1024 principal)`, response/response-count maps.
     - `give-feedback(...)`: Cross-call `identity-registry owner-of`, ban self-feedback (owner/operator), verify auth (secp256k1-recover? on EIP-191 hash or func-call), store 1-indexed, emit `NewFeedback`.
     - `revoke-feedback(agent-id, index)`: Client-only, mark revoked.
     - `append-response(...)`: Anyone? Track responders/counts, emit.
     - RO: `get-summary(agent-id, opt-clients (list 200), opt-tags) → {count: uint, average: uint}`, `read-feedback(...)`, `read-all-feedback(...)` (paginated), `get-clients(agent-id)`.
   - Auth: `(buff 65) sig` → recover pubkey matches signer (owner/op via identity), params: `{agent-id, client, index-limit, expiry: uint, chain-id: uint, registry: principal, signer: principal}` hashed as keccak256(EIP-191).
   - Tests: `tests/reputation-registry.test.ts` (auth sig/func, multi-feedback, revoke, summary filters, cross-call identity).

2. **Validation Registry** (1 day):
   - Implement `contracts/validation-registry.clar`:
     - Maps: `validations (buff 32) → {validator: principal, agent-id: uint, response: uint, response-hash: (buff 32), tag: (buff 32), last-update: uint}`, `agent-validations {agent-id: uint} → (list 1024 (buff 32))`.
     - `validation-request(validator: principal, agent-id: uint, uri: (string-utf8 512), hash: (buff 32))`: Owner/approved only (cross-call identity).
     - `validation-response(hash: (buff 32), response: uint, uri, response-hash, tag)`: `msg.sender == validator`.
     - RO: `get-summary(agent-id, opt-validators (list 200), opt-tag) → {count: uint, avg: uint}`, lists.
   - Tests: `tests/validation-registry.test.ts`.

3. **Integration/Deploy** (1 day):
   - Update `Clarinet.toml`: Add rep/valid contracts + traits? (for cross-calls).
   - Integration tests: `tests/erc8004-integration.test.ts` (full flows: register → feedback/validation).
   - Deploy Hiro Testnet (`clarinet deploy --network testnet`), update `README.md` w/ addresses/ABIs/JSON examples.
   - Multichain ID example.

4. **Polish/Repo** (0.5 day):
   - Repo cleanup: Delete old contracts/docs.
   - `README.md`: Mirror Solidity (install, test, deploy, testnet addrs).
   - Events: Standardize `notification`/`payload`.
   - PR to ERC-8004 org.

**Risks/Mitigations** (Updated):
- ✅ Loops: Fixed-size lists, pagination (e.g., `get-children` pattern).
- Sig recovery: Use Clarity `secp256k1-recover?` w/ test vectors.
- Cross-contract: Direct `contract-call?` (no traits needed for RO).
- Costs: Batch ops via fold, RO summaries loop <200.

**Live Goal**: Full ERC-8004 Stacks Testnet (3 contracts, tests, addrs) in 3-4 days.

**Risks/Mitigations**:

- Sig recovery: Test vectors from Solidity/Clarity docs.
- Loops: Pagination + gas limits.
- No upgrades: v2 new deploy.

**Live Goal**: Stacks ERC-8004 testnet in 1 week, spec-compliant.
