import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "crypto";

/**
 * Admin guard for connector-registry routes.
 *
 * The repo has no API auth layer today (all controllers are open), so this
 * introduces the minimal pattern: a shared secret in the `x-api-key` header,
 * sourced from VOICE_CONNECTORS_API_KEY. Fails closed — when the key is not
 * configured, the routes stay locked instead of silently open.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>("VOICE_CONNECTORS_API_KEY");
    if (!expected) {
      throw new UnauthorizedException(
        "Connector admin API is not configured (VOICE_CONNECTORS_API_KEY missing)",
      );
    }
    const request = context.switchToHttp().getRequest();
    const provided: unknown = request?.headers?.["x-api-key"];
    if (typeof provided !== "string" || !safeEqual(provided, expected)) {
      throw new UnauthorizedException("Invalid or missing API key");
    }
    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}
