import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./models.js", () => ({
  discoverPiModelsCached: vi.fn(
    async ({ env }: { env?: Record<string, string> }) => {
      const { readFile } = await import("node:fs/promises");
      const path = await import("node:path");
      const agentConfigDir = env?.PI_CODING_AGENT_DIR;
      if (!agentConfigDir) throw new Error("PI_CODING_AGENT_DIR was not set");
      const models = JSON.parse(
        await readFile(path.join(agentConfigDir, "models.json"), "utf8"),
      ) as { providers: Record<string, { models: Array<{ id: string }> }> };
      if (
        models.providers.paperclip?.models.map((model) => model.id).join(",") !==
        "sig-default"
      ) {
        throw new Error("PAPERCLIP_PI_PROVIDERS was not materialized");
      }
      return [{ id: "paperclip/sig-default", label: "paperclip/sig-default" }];
    },
  ),
}));

import { discoverPiModelsCached } from "./models.js";
import { testEnvironment } from "./test.js";

describe("Pi environment test", () => {
  afterEach(() => {
    vi.mocked(discoverPiModelsCached).mockClear();
  });

  it("materializes PAPERCLIP_PI_PROVIDERS before model discovery", async () => {
    const result = await testEnvironment({
      companyId: "company-1",
      adapterType: "pi_local",
      config: {
        command: process.execPath,
        cwd: process.cwd(),
        model: "",
        env: {
          PAPERCLIP_PI_PROVIDERS: JSON.stringify({
            paperclip: {
              baseUrl: "https://si.siglent.com/v1",
              apiKey: "fixture-key",
              api: "openai-completions",
              models: [{ id: "sig-default", name: "sig-default" }],
            },
          }),
        },
      },
      executionTarget: null,
      environmentName: null,
    });

    expect(discoverPiModelsCached).toHaveBeenCalledTimes(1);
    expect(result.checks).toContainEqual(
      expect.objectContaining({ code: "pi_models_discovered" }),
    );
  });
});
