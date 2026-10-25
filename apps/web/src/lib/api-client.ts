import type { ApiResponse, HealthResponse, Agent } from "@nexus-agent/types";
import { env } from "@/lib/env";

export async function fetchHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/health`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json: ApiResponse<HealthResponse> = await res.json();
    return json.data ?? null;
  } catch (err) {
    console.warn("API health check unavailable:", err);
    return null;
  }
}

export async function fetchAgents(): Promise<Agent[]> {
  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/agents`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json: ApiResponse<Agent[]> = await res.json();
    return json.data ?? [];
  } catch (err) {
    console.warn("API fetchAgents unavailable:", err);
    return [];
  }
}
