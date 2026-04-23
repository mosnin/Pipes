import { sampleData, sampleSystemId } from "@/lib/convex/mockData";
import { runtimeFlags } from "@/lib/env";

export interface AppDataClient {
  getSystemById(systemId: string): Promise<(typeof sampleData.systems)[number] | null>;
  getSampleData(): Promise<typeof sampleData>;
}

class MockConvexClient implements AppDataClient {
  async getSystemById(systemId: string) {
    return sampleData.systems.find((system) => system.id === systemId) ?? null;
  }

  async getSampleData() {
    return sampleData;
  }
}

class ConvexClientStub extends MockConvexClient {}

export function getDataClient(): AppDataClient {
  if (!runtimeFlags.hasConvex || runtimeFlags.useMocks) {
    return new MockConvexClient();
  }

  return new ConvexClientStub();
}

export { sampleData, sampleSystemId };
