import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

describe("public evaluation endpoint", () => {
  it("rejects missing or malformed invitation tokens before accessing Supabase", async () => {
    const request = new NextRequest("http://localhost/api/public-evaluations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        invitationToken: "not-a-token",
        idempotencyKey: "submission-key-123456",
        formData: {},
        assessment: {},
        professionalReview: {},
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid invitation or assessment.",
    });
  });
});
