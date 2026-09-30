import { AdaptiveToolRegistryService } from "./adaptive-tool-registry.service";

describe("AdaptiveToolRegistryService", () => {
  const manifest = {
    id: "poke",
    name: "Poke workspace",
    version: "1.0.0",
    transport: "mcp-http" as const,
    endpoint: "https://connector.example.com/mcp",
    tools: [
      {
        name: "calendar.create",
        description: "Create a calendar event",
        inputSchema: { type: "object" },
        risk: "write" as const,
      },
    ],
  };

  it("adapts names and forces confirmation for mutating tools", () => {
    const registry = new AdaptiveToolRegistryService();
    const [tool] = registry.register(manifest);
    expect(tool.canonicalName).toBe("poke__calendar_create");
    expect(tool.requiresConfirmation).toBe(true);
    expect(registry.resolve(tool.canonicalName)?.tool.name).toBe(
      "calendar.create",
    );
  });

  it("replaces a connector atomically and removes stale aliases", () => {
    const registry = new AdaptiveToolRegistryService();
    registry.register(manifest);
    registry.register({
      ...manifest,
      tools: [{ ...manifest.tools[0], name: "calendar.list", risk: "read" }],
    });
    expect(registry.resolve("poke__calendar_create")).toBeNull();
    expect(registry.resolve("poke__calendar_list")?.tool.risk).toBe("read");
  });

  it("rejects insecure remote endpoints", () => {
    const registry = new AdaptiveToolRegistryService();
    expect(() =>
      registry.register({
        ...manifest,
        endpoint: "http://connector.example.com",
      }),
    ).toThrow("HTTPS");
  });
});
