import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  AdaptiveConnectorManifest,
  AdaptiveToolRegistryService,
} from "./services/adaptive-tool-registry.service";
import { ApiKeyGuard } from "./guards/api-key.guard";

// Connector administration mutates the tool vocabulary the voice runtime
// trusts, so every route here requires the admin API key (VOICE_CONNECTORS_API_KEY).
@Controller("voice/connectors")
@UseGuards(ApiKeyGuard)
export class AdaptiveToolsController {
  constructor(private readonly registry: AdaptiveToolRegistryService) {}

  @Get()
  list() {
    return { connectors: this.registry.list() };
  }

  @Post()
  register(@Body() manifest: AdaptiveConnectorManifest) {
    return {
      connectorId: manifest.id,
      tools: this.registry.register(manifest),
    };
  }

  @Delete(":id")
  unregister(@Param("id") id: string) {
    return { connectorId: id, removed: this.registry.unregister(id) };
  }
}
