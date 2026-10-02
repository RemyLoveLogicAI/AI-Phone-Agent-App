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

  // --- PR #10 review fixes ---

  it("rejects tool names that collide after canonicalization", () => {
    const registry = new AdaptiveToolRegistryService();
    expect(() =>
      registry.register({
        ...manifest,
        tools: [
          manifest.tools[0],
          {
            name: "calendar_create",
            description: "Underscore twin",
            inputSchema: { type: "object" },
            risk: "read" as const,
          },
        ],
      }),
    ).toThrow("collide after canonicalization");
  });

  it("rejects cross-connector canonical name collisions", () => {
    const registry = new AdaptiveToolRegistryService();
    registry.register({
      ...manifest,
      id: "a",
      tools: [{ ...manifest.tools[0], name: "_b" }],
    });
    expect(() =>
      registry.register({
        ...manifest,
        id: "a_",
        tools: [{ ...manifest.tools[0], name: "b" }],
      }),
    ).toThrow("cross-connector collision");
    // The first connector's tool still resolves — no silent overwrite.
    expect(registry.resolve("a___b")?.tool.name).toBe("_b");
  });

  it("rejects cross-connector collisions regardless of registration order", () => {
    const registry = new AdaptiveToolRegistryService();
    registry.register({
      ...manifest,
      id: "a_",
      tools: [{ ...manifest.tools[0], name: "b" }],
    });
    expect(() =>
      registry.register({
        ...manifest,
        id: "a",
        tools: [{ ...manifest.tools[0], name: "_b" }],
      }),
    ).toThrow("cross-connector collision");
  });

  it("leaves the registry untouched when a cross-connector registration is rejected", () => {
    const registry = new AdaptiveToolRegistryService();
    registry.register({
      ...manifest,
      id: "a",
      tools: [{ ...manifest.tools[0], name: "_b" }],
    });
    expect(() =>
      registry.register({
        ...manifest,
        id: "a_",
        tools: [{ ...manifest.tools[0], name: "b" }],
      }),
    ).toThrow("cross-connector collision");
    expect(registry.list().map((c) => c.id)).toEqual(["a"]);
    expect(registry.resolve("a___b")).toMatchObject({
      tool: { name: "_b" },
    });
  });

  it("resolves tools for uppercase connector ids", () => {
    const registry = new AdaptiveToolRegistryService();
    const [tool] = registry.register({ ...manifest, id: "Poke" });
    expect(tool.connectorId).toBe("poke");
    expect(registry.resolve(tool.canonicalName)?.tool.name).toBe(
      "calendar.create",
    );
    expect(registry.unregister("POKE")).toBe(true);
  });

  it("rejects connector ids containing the canonical separator", () => {
    const registry = new AdaptiveToolRegistryService();
    expect(() => registry.register({ ...manifest, id: "my__conn" })).toThrow(
      "__",
    );
  });

  it("rejects endpoints with embedded credentials", () => {
    const registry = new AdaptiveToolRegistryService();
    expect(() =>
      registry.register({
        ...manifest,
        endpoint: "https://user:pass@connector.example.com/mcp",
      }),
    ).toThrow("must not embed credentials");
  });

  it("allows HTTP only for localhost endpoints", () => {
    const registry = new AdaptiveToolRegistryService();
    expect(() =>
      registry.register({ ...manifest, endpoint: "ftp://localhost/mcp" }),
    ).toThrow("HTTPS");
    expect(() =>
      registry.register({ ...manifest, endpoint: "http://localhost:4010/mcp" }),
    ).not.toThrow();
  });

  it("rejects tools missing required metadata instead of crashing", () => {
    const registry = new AdaptiveToolRegistryService();
    expect(() =>
      registry.register({
        ...manifest,
        tools: [{ name: "bare", risk: "read" } as never],
      }),
    ).toThrow("description");
    expect(() =>
      registry.register({ ...manifest, tools: [null as never] }),
    ).toThrow("must be an object");
  });

  it("throws BadRequestException (HTTP 400) for invalid manifests", () => {
    const registry = new AdaptiveToolRegistryService();
    try {
      registry.register({ ...manifest, endpoint: "not a url" });
      throw new Error("expected register to throw");
    } catch (error) {
      expect((error as { getStatus?: () => number }).getStatus?.()).toBe(400);
    }
  });
});
