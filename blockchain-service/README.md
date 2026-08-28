# blockchain-service (placeholder)

Reserved location for the **blockchain integration layer** between Spring Boot
and **Hyperledger Fabric** (architecture decisions D9–D11). It will record only
selected immutable audit / integrity events — never the full project database or
large evidence files.

**Not scaffolded in the Project Foundation phase.**

Basic blockchain audit-event integration is a Round 1 **P1** item and is built
only after the P0 workflow is stable. Citizens never access Fabric directly;
blockchain-backed information is exposed through controlled Spring Boot APIs.
