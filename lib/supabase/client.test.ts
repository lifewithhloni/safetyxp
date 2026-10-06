import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockCreateBrowserClient = jest.fn((...args: unknown[]) => ({ auth: {}, argumentCount: args.length }));

jest.mock("@supabase/ssr", () => ({
  createBrowserClient: (...args: unknown[]) => mockCreateBrowserClient(...args),
}));

import { createClient } from "@/lib/supabase/client";

describe("browser Supabase client", () => {
  beforeEach(() => {
    mockCreateBrowserClient.mockClear();
  });

  it("uses the default browser cookie handling without a custom cookie adapter", () => {
    createClient();

    expect(mockCreateBrowserClient).toHaveBeenCalledTimes(1);
    expect(mockCreateBrowserClient.mock.calls[0]).toHaveLength(2);
  });
});
