<!-- METADATA: {"source_path": "apps/api/src/voice/voice.module.ts", "source_sha": "", "extraction_quality": "regex_fallback", "model": "gpt-5-mini", "generated_at": "2026-07-25T08:05:17Z", "doc_type": "file"} -->
<details>
<summary>Documentation Metadata (click to expand)</summary>

```json
{
  "doc_type": "file_overview",
  "file_path": "apps/api/src/voice/voice.module.ts",
  "source_hash": "b8c7225f370919f2c61ca830ec99c0a8cb688f7e87863c9c536b7077b05aa65f",
  "last_updated": "2026-07-25T08:05:17.032601+00:00",
  "tokens_used": 761,
  "complexity_score": 1,
  "estimated_review_time_minutes": 5,
  "external_dependencies": [
    "import { Module } from \"@nestjs/common\";",
    "import { VoiceStreamGateway } from \"./voice-stream.gateway\";",
    "import { VoiceController } from \"./voice.controller\";",
    "import { CallLedgerService } from \"./services/call-ledger.service\";",
    "import { ShadowBrainService } from \"./services/shadow-brain.service\";",
    "import { PolicyEngineService } from \"./services/policy-engine.service\";",
    "import { TrustScoringService } from \"./services/trust-scoring.service\";",
    "import { IntelligencePackService } from \"./services/intelligence-pack.service\";",
    "import { PrismaModule } from \"../prisma/prisma.module\";",
    "import { AdaptiveToolsController } from \"./adaptive-tools.controller\";",
    "import { AdaptiveToolRegistryService } from \"./services/adaptive-tool-registry.service\";"
  ]
}
```

</details>

[Documentation Home](../../../../README.md) > [apps](../../../README.md) > [api](../../README.md) > [src](../README.md) > [voice](./README.md) > **voice.module**

---

# voice.module.ts

> **File:** `apps/api/src/voice/voice.module.ts`

![Complexity: Low](https://img.shields.io/badge/Complexity-Low-green) ![Review Time: 5min](https://img.shields.io/badge/Review_Time-5min-blue)

## 📑 Table of Contents


- [Overview](#overview)
- [Dependencies](#dependencies)
- [Architecture Notes](#architecture-notes)
- [Maintenance Notes](#maintenance-notes)
- [Functions and Classes](#functions-and-classes)

---

## Overview

This TypeScript file defines a NestJS module for the voice subsystem of an API. Based on the imports, the module groups together controllers (VoiceController, AdaptiveToolsController), a WebSocket gateway (VoiceStreamGateway), and several domain services related to call handling, policy, trust scoring, intelligence packs, and an adaptive tool registry. It also imports a PrismaModule, indicating that the voice module depends on shared database access provided elsewhere in the application.

The module's purpose is to gather all voice-related components into a single NestJS module boundary so they can be registered with the application container together. By bringing controllers, a gateway, and multiple services into one module, the file organizes responsibilities like streaming voice interactions, managing call ledgers, performing policy and trust evaluations, and exposing adaptive tooling endpoints while leveraging the Prisma database integration.

## Dependencies

### External Dependencies

| Module | Usage |
| --- | --- |
| `import { Module } from "@nestjs/common";` | import { Module } from "@nestjs/common"; |
| `import { VoiceStreamGateway } from "./voice-stream.gateway";` | import { VoiceStreamGateway } from "./voice-stream.gateway"; |
| `import { VoiceController } from "./voice.controller";` | import { VoiceController } from "./voice.controller"; |
| `import { CallLedgerService } from "./services/call-ledger.service";` | import { CallLedgerService } from "./services/call-ledger.service"; |
| `import { ShadowBrainService } from "./services/shadow-brain.service";` | import { ShadowBrainService } from "./services/shadow-brain.service"; |
| `import { PolicyEngineService } from "./services/policy-engine.service";` | import { PolicyEngineService } from "./services/policy-engine.service"; |
| `import { TrustScoringService } from "./services/trust-scoring.service";` | import { TrustScoringService } from "./services/trust-scoring.service"; |
| `import { IntelligencePackService } from "./services/intelligence-pack.service";` | import { IntelligencePackService } from "./services/intelligence-pack.service"; |
| `import { PrismaModule } from "../prisma/prisma.module";` | import { PrismaModule } from "../prisma/prisma.module"; |
| `import { AdaptiveToolsController } from "./adaptive-tools.controller";` | import { AdaptiveToolsController } from "./adaptive-tools.controller"; |
| `import { AdaptiveToolRegistryService } from "./services/adaptive-tool-registry.service";` | import { AdaptiveToolRegistryService } from "./services/adaptive-tool-registry.service"; |

## 📁 Directory

This file is part of the **voice** directory. View the [directory index](_docs/apps/api/src/voice/README.md) to see all files in this module.

## Architecture Notes

- Uses the NestJS Module pattern to group controllers, gateways, and providers.
- Separation of concerns between controllers, a gateway, and multiple domain services.
- Integration with a shared PrismaModule for database access.
- Documentation generated from regex-based extraction for TypeScript; class/function detection is best-effort.

## Maintenance Notes

- Register voice-related controllers (VoiceController, AdaptiveToolsController) so HTTP routes for voice features are available.
- Include a WebSocket gateway (VoiceStreamGateway) to handle streaming or real-time voice interactions.
- Provide and wire up domain services such as CallLedgerService, ShadowBrainService, PolicyEngineService, TrustScoringService, IntelligencePackService, and AdaptiveToolRegistryService.
- Depend on the shared PrismaModule to give the voice components access to the application's database layer.

---

## Navigation

**↑ Parent Directory:** [Go up](_docs/apps/api/src/voice/README.md)

---

*This documentation was automatically generated by AI ([Woden DocBot](https://github.com/marketplace/ai-document-creator)) and may contain errors. It is the responsibility of the user to validate the accuracy and completeness of this documentation.*
