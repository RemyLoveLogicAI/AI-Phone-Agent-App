import { Injectable } from "@nestjs/common";

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

/**
 * Converts MCP/plugin manifests into one stable tool vocabulary for the voice
 * runtime. The registry deliberately stores no credentials: connector secrets
 * belong in the execution plane, never in a model-visible manifest.
 */
@Injectable()
export class AdaptiveToolRegistryService {
  private readonly connectors = new Map<string, AdaptiveConnectorManifest>();
  private readonly aliases = new Map<string, string>();

  register(manifest: AdaptiveConnectorManifest): AdaptedVoiceTool[] {
    this.validateManifest(manifest);
    const copy = structuredClone(manifest);
    const previous = this.connectors.get(copy.id);
    if (previous) {
      for (const tool of previous.tools) {
        this.aliases.delete(this.canonicalName(previous.id, tool.name));
      }
    }
    this.connectors.set(copy.id, copy);

    for (const tool of copy.tools) {
      this.aliases.set(this.canonicalName(copy.id, tool.name), tool.name);
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
    const separator = canonicalName.indexOf("__");
    if (separator < 1) return null;
    const connectorId = canonicalName.slice(0, separator);
    const connector = this.connectors.get(connectorId);
    const nativeName = this.aliases.get(canonicalName);
    const tool = connector?.tools.find((item) => item.name === nativeName);
    return connector && tool
      ? { connector: structuredClone(connector), tool: structuredClone(tool) }
      : null;
  }

  unregister(id: string): boolean {
    const connector = this.connectors.get(id);
    if (!connector) return false;
    for (const tool of connector.tools) {
      this.aliases.delete(this.canonicalName(id, tool.name));
    }
    return this.connectors.delete(id);
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
      throw new Error(
        "Connector id must contain only letters, numbers, _ or -",
      );
    }
    if (!manifest.name || !manifest.version || !manifest.endpoint) {
      throw new Error("Connector name, version, and endpoint are required");
    }
    if (!["mcp-http", "webhook"].includes(manifest.transport)) {
      throw new Error("Unsupported connector transport");
    }
    const endpoint = new URL(manifest.endpoint);
    if (endpoint.protocol !== "https:" && endpoint.hostname !== "localhost") {
      throw new Error(
        "Connector endpoint must use HTTPS (localhost is exempt)",
      );
    }
    if (!Array.isArray(manifest.tools) || manifest.tools.length === 0) {
      throw new Error("Connector must expose at least one tool");
    }
    const names = new Set<string>();
    for (const tool of manifest.tools) {
      if (!tool.name || names.has(tool.name)) {
        throw new Error("Tool names must be present and unique");
      }
      if (!["read", "write", "sensitive"].includes(tool.risk)) {
        throw new Error(`Invalid risk classification for tool '${tool.name}'`);
      }
      names.add(tool.name);
    }
  }
}
