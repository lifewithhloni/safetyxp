import { describe, expect, it } from "@jest/globals";
import { renderSafetyXpEmailTemplate } from "./email.service";

describe("employee invitation email rendering", () => {
  it("escapes user-controlled greeting and generated invitation URL in HTML", () => {
    const email = renderSafetyXpEmailTemplate({
      heading: "You're invited to SafetyXP",
      greeting: "Hello <img src=x onerror=alert(1)>,",
      message: "Set a password using the invitation link.",
      ctaLabel: "Create your password",
      ctaUrl: "https://auth.example.test/invite?token=one&next=two",
    });

    expect(email.html).toContain("Hello &lt;img src=x onerror=alert(1)&gt;,");
    expect(email.html).toContain("token=one&amp;next=two");
    expect(email.html).not.toContain("<img src=x");
  });
});
