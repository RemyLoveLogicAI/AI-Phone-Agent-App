import { BadRequestException, Injectable } from "@nestjs/common";

export type ToolRisk = "read" | "write" | "sensitive";

export interface AdaptiveToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  risk: ToolRisk;
  timeoutMs?: number;
}

export interface AdaptiveConnectorManifest {
  id: string;
  name: string;
  version: string;
  transport: "mcp-http" | "webhook";
  endpoint: string;
  tools: AdaptiveToolDefinition[];
}

export interface AdaptedVoiceTool extends AdaptiveToolDefinition {
  canonicalName: string;
  connectorId: string;
  requiresConfirmation: boolean;
}

interface AliasEntry {
  connectorId: string;
  toolName: string;
}

/**
 * Converts MCP/plugin manifests into one stable tool vocabulary for the voice
 * runtime. The registry deliberately stores no credentials: connector secrets
 * belong in the execution plane, never in a model-visible manifest.
 */
@Injectable()
export class AdaptiveToolRegistryService {
  private readonly connectors = new Map<string, AdaptiveConnectorManifest>();
  private readonly aliases = new Map<string, AliasEntry>();

  register(manifest: AdaptiveConnectorManifest): AdaptedVoiceTool[] {
    this.validateManifest(manifest);
    const copy = structuredClone(manifest);
    // Connector identity is case-insensitive: canonical names are lowercase,
    // so the stored id must be too, or resolve() can never find the connector.
    copy.id = copy.id.toLowerCase();
    // Cross-connector collision guard: the canonical encoding is lossy, so two
    // DIFFERENT connectors can produce the same canonical name (e.g. connector
    // "a_" + tool "b" vs connector "a" + tool "_b" both yield "a___b").
    // Silently overwriting the alias would route invocations to the wrong
    // tool, so the registration is rejected loudly instead. Aliases owned by
    // this same connector are excluded: a replace intentionally reclaims its
    // own names. Aliases owned by
    // this same connector are excluded: a replace intentionally reclaims its
    // own names.
    for (const tool of copy.tools) {
      const canonical = this.canonicalName(copy.id, tool.name);
      const existing = this.aliases.get(canonical);
      if (existing && existing.connectorId !== copy.id) {
        throw new BadRequestException(
          `Canonical name '${canonical}' is already registered by connector '${existing.connectorId}'; rename the connector or tool to avoid the cross-connector collision`,
        );
      }
    }
    // Preflight passed: now it is safe to mutate. Drop the previous alias set
    // (if any) before installing the new one, so a replace never leaves stale
    // names behind.
    const previous = this.connectors.get(copy.id);
    if (previous) {
      for (const tool of previous.tools) {
        this.aliases.delete(this.canonicalName(previous.id, tool.name));
      }
    }
    this.connectors.set(copy.id, copy);

    for (const tool of copy.tools) {
      this.aliases.set(this.canonicalName(copy.id, tool.name), {
        connectorId: copy.id,
        toolName: tool.name,
      });
    }

    return this.adapt(copy);
  }

  list(): Array<
    AdaptiveConnectorManifest & { adaptedTools: AdaptedVoiceTool[] }
  > {
    return [...this.connectors.values()].map((connector) => ({
      ...structuredClone(connector),
      adaptedTools: this.adapt(connector),
    }));
  }

  resolve(canonicalName: string): {
    connector: AdaptiveConnectorManifest;
    tool: AdaptiveToolDefinition;
  } | null {
    // Resolve through the alias map instead of parsing the canonical name:
    // the canonical encoding is lossy, so the connector id cannot be
    // reconstructed from it reliably.
    const alias = this.aliases.get(canonicalName);
    if (!alias) return null;
    const connector = this.connectors.get(alias.connectorId);
    const tool = connector?.tools.find((item) => item.name === alias.toolName);
    return connector && tool
      ? { connector: structuredClone(connector), tool: structuredClone(tool) }
      : null;
  }

  unregister(id: string): boolean {
    const normalizedId = typeof id === "string" ? id.toLowerCase() : id;
    const connector = this.connectors.get(normalizedId);
    if (!connector) return false;
    for (const tool of connector.tools) {
      this.aliases.delete(this.canonicalName(normalizedId, tool.name));
    }
    return this.connectors.delete(normalizedId);
  }

  private adapt(connector: AdaptiveConnectorManifest): AdaptedVoiceTool[] {
    return connector.tools.map((tool) => ({
      ...structuredClone(tool),
      canonicalName: this.canonicalName(connector.id, tool.name),
      connectorId: connector.id,
      requiresConfirmation: tool.risk !== "read",
    }));
  }

  private canonicalName(connectorId: string, toolName: string): string {
    return `${connectorId}__${toolName}`
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_");
  }

  private validateManifest(manifest: AdaptiveConnectorManifest): void {
    if (!manifest?.id || !/^[a-zA-Z0-9_-]+$/.test(manifest.id)) {
      throw new BadRequestException(
        "Connector id must contain only letters, numbers, _ or -",
      );
    }
    if (manifest.id.includes("__")) {
      throw new BadRequestException(
        "Connector id must not contain '__' (reserved as the tool-name separator)",
      );
    }
    if (!manifest.name || !manifest.version || !manifest.endpoint) {
      throw new BadRequestException(
        "Connector name, version, and endpoint are required",
      );
    }
    if (!["mcp-http", "webhook"].includes(manifest.transport)) {
      throw new BadRequestException("Unsupported connector transport");
    }
    let endpoint: URL;
    try {
      endpoint = new URL(manifest.endpoint);
    } catch {
      throw new BadRequestException("Connector endpoint must be a valid URL");
    }
    if (endpoint.username || endpoint.password) {
      throw new BadRequestException(
        "Connector endpoint must not embed credentials; keep secrets in the execution plane",
      );
    }
    const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(
      endpoint.hostname,
    );
    if (
      endpoint.protocol !== "https:" &&
      !(endpoint.protocol === "http:" && isLoopback)
    ) {
      throw new BadRequestException(
        "Connector endpoint must use HTTPS (HTTP is allowed only for localhost)",
      );
    }
    if (!Array.isArray(manifest.tools) || manifest.tools.length === 0) {
      throw new BadRequestException("Connector must expose at least one tool");
    }
    const names = new Set<string>();
    const canonicalNames = new Set<string>();
    for (const tool of manifest.tools) {
      if (!tool || typeof tool !== "object") {
        throw new BadRequestException("Each tool must be an object");
      }
      if (!tool.name || names.has(tool.name)) {
        throw new BadRequestException("Tool names must be present and unique");
      }
      const canonical = this.canonicalName(manifest.id, tool.name);
      if (canonicalNames.has(canonical)) {
        throw new BadRequestException(
          `Tool names collide after canonicalization ('${canonical}'); rename one so each tool keeps a unique canonical name`,
        );
      }
      if (
        typeof tool.description !== "string" ||
        tool.description.trim() === ""
      ) {
        throw new BadRequestException(
          `Tool '${tool.name}' must have a description`,
        );
      }
      if (
        !tool.inputSchema ||
        typeof tool.inputSchema !== "object" ||
        Array.isArray(tool.inputSchema)
      ) {
        throw new BadRequestException(
          `Tool '${tool.name}' must provide an inputSchema object`,
        );
      }
      if (!["read", "write", "sensitive"].includes(tool.risk)) {
        throw new BadRequestException(
          `Invalid risk classification for tool '${tool.name}'`,
        );
      }
      if (
        tool.timeoutMs !== undefined &&
        (typeof tool.timeoutMs !== "number" ||
          !Number.isFinite(tool.timeoutMs) ||
          tool.timeoutMs <= 0)
      ) {
        throw new BadRequestException(
          `Tool '${tool.name}' timeoutMs must be a positive number`,
        );
      }
      names.add(tool.name);
      canonicalNames.add(canonical);
    }
  }
}
