# StarkCert - Certificate Verification System

A decentralized certificate verification system built on Starknet using Cairo.

## Features

- **Certificate Issuance**: Authorized issuers can create digital certificates
- **Certificate Verification**: Anyone can verify the authenticity of certificates
- **Certificate Revocation**: Issuers can revoke certificates when needed
- **Issuer Management**: Owner can authorize/remove certificate issuers
- **Expiry Management**: Certificates can have expiration dates
- **Statistics Tracking**: Track total and active certificates

## Project Structure

\`\`\`
starkcert/
├── src/
│ ├── lib.cairo # Main library entry point
│ ├── interfaces/
│ │ ├── mod.cairo # Interface module
│ │ └── starkcert_interface.cairo # Main contract interface
│ ├── contracts/
│ │ ├── mod.cairo # Contract module
│ │ └── starkcert.cairo # Main StarkCert contract
│ └── utils/
│ ├── mod.cairo # Utilities module
│ └── helpers.cairo # Helper functions
├── tests/
│ └── test_starkcert.cairo # Contract tests
├── Scarb.toml # Project configuration
├── foundry.toml # Foundry configuration
└── README.md # This file
\`\`\`

## Prerequisites

- [Scarb](https://docs.swmansion.com/scarb/) (Cairo package manager)
- [Starknet Foundry](https://foundry-rs.github.io/starknet-foundry/) (Testing framework)

## Installation

1. Clone the repository:
   \`\`\`bash
   git clone <repository-url>
   cd starkcert
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   scarb build
   \`\`\`

## Building

Build the project:
\`\`\`bash
scarb build
\`\`\`

This will compile the Cairo contracts and generate Sierra and CASM files.

## Testing

Run the test suite:
\`\`\`bash
snforge test
\`\`\`

Run tests with verbose output:
\`\`\`bash
snforge test -v
\`\`\`

Run specific test:
\`\`\`bash
snforge test test_issue_certificate
\`\`\`

## Usage

### Contract Deployment

1. Deploy the contract with an owner address:

```cairo
// Constructor parameters
let owner = contract_address_const::<'owner'>();
```
