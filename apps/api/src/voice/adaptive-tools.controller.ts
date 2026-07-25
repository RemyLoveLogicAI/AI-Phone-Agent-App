import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import {
  AdaptiveConnectorManifest,
  AdaptiveToolRegistryService,
} from "./services/adaptive-tool-registry.service";

@Controller("voice/connectors")
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
