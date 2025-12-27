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

1. **Three Contracts** (modular, each refs `identity-registry`):
   | Contract | Purpose | Key Maps/Functions |
   |----------|---------|--------------------|
   | `identity-registry.clar` | Agent registration (ERC-721 equiv.) | `_owners: {u64 => principal}`, `_uris: {u64 => (string-utf8 512)}`, `_metadata: {u64 => {(string-utf8 128) => (buff 512)}}`, `_operators: {u64 => {principal => bool}}`<br>`register([uri: (string-utf8 512), metadata: [{key: (string-utf8 128), value: (buff 512)}]]) → u64 agentId`, `ownerOf(u64)`, `setURI(u64, (string-utf8 512))`, `setMetadata(u64, key, value)`, `isApprovedForAll(u64, principal)` |
   | `reputation-registry.clar` | Feedback (score/tags/revoke/response) | `_feedback: {u64 => principal => u64 => Feedback {score: u8, tag1: (buff 32), tag2: (buff 32), isRevoked: bool}}`, `_lastIndex: {u64 => principal => u64}`, `_clients: {u64 => (list 1024 principal)}`<br>`giveFeedback(u64 agentId, u8 score, (buff 32) tag1/2, (string-utf8 512) uri, (buff 32) hash, bytes authSig/funcSig)`, `revokeFeedback(u64 agentId, u64 index)`, `getSummary(u64 agentId, [principal[] clients, (buff 32) tag1/2]) → {count: u64, average: u8}` |
   | `validation-registry.clar` | Validator requests/responses | `_validations: {(buff 32) requestHash => ValidationStatus {validator: principal, agentId: u64, response: u8, responseHash: (buff 32), tag: (buff 32), lastUpdate: u64}}`, `_agentValidations: {u64 => (list 1024 (buff 32))}`<br>`validationRequest(principal validator, u64 agentId, (string-utf8 512) uri, (buff 32) hash)`, `validationResponse((buff 32) hash, u8 response, [(string-utf8 512) uri, (buff 32) hash, (buff 32) tag])`, `getSummary(u64 agentId, [principal[] validators, (buff 32) tag]) → {count: u64, avg: u8}` |

2. **Deployment**:

   - **Testnet First**: Hiro Testnet (stacks chainId: use `stacks-blockchain` query).
   - Singleton: Owner multisig/timelock post-deploy.
   - Clarinet deploy scripts + `settings/Testnet.toml`.

3. **Multichain ID**: `stacks:<chainId>:<identityRegistry>:<agentId>` in agent JSON `registrations[]`. Per CAIP-2 for Stacks Mainnet: `stacks:1` and Stacks Testnet: `stacks:2147483648`

4. **Gas/Storage**: Fixed-size `string-utf8`/`buff`, paginate loops (`readAllFeedback`).

## Next Steps (Prioritized, 1-2 Days Each)

1. **Repo Cleanup (Today)**:

   - Delete `agent-account-example.clar`/`.md`, `owner-agent-registry.clar`/`.md`.
   - Stub `registry-addon-attestation.clar` → delete/merge.
   - Update `Clarinet.toml`: Three contracts.
   - Rename: `contracts/identity-registry.clar`, etc.
   - `README.md`: Mirror Solidity (addresses, install/test/deploy).

2. **Identity Registry**:

   - Data-var `_nextAgentId: u64 = 1`.
   - Owner/operator maps/events.
   - Tests: `tests/identity-registry.test.ts`.

3. **Reputation + Auth**:

   - `_verifyFeedbackAuth`: Hash `(agentId, client, indexLimit, expiry, chainId, registry, signer)` → recover pubkey == signer (owner/operator).
   - Ban self-feedback.
   - Tests: Auth (signed+func), multi-feedback, summaries.

4. **Validation Registry**:

   - Owner/operator requests.
   - Tests: Requests/responses/summaries.

5. **Integration/Deploy**:

   - Cross-calls (rep/valid → identity `ownerOf`).
   - Full tests: `tests/erc8004-full.test.ts`.
   - Deploy Hiro Testnet, update README addresses/JSON example.

6. **Polish**:
   - `getVersion() → (string-utf8 32)`.
   - Events for indexers.
   - PR to `erc8004-org/erc8004-stacks`.

**Risks/Mitigations**:

- Sig recovery: Test vectors from Solidity/Clarity docs.
- Loops: Pagination + gas limits.
- No upgrades: v2 new deploy.

**Live Goal**: Stacks ERC-8004 testnet in 1 week, spec-compliant.
