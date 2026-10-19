import { BadRequestException } from "@nestjs/common";
import { AdaptiveToolsController } from "./adaptive-tools.controller";
import { AdaptiveToolRegistryService } from "./services/adaptive-tool-registry.service";

describe("AdaptiveToolsController", () => {
  it("maps malformed manifests to an HTTP 400 exception", () => {
    const controller = new AdaptiveToolsController(
      new AdaptiveToolRegistryService(),
    );

    expect(() =>
      controller.register({
        id: "bad connector id",
        name: "Bad",
        version: "1",
        transport: "mcp-http",
        endpoint: "https://example.com/mcp",
        tools: [],
      }),
    ).toThrow(BadRequestException);
  });
});
