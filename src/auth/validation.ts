/**
 * Email + password validation for the sign-in / sign-up form.
 *
 * Password rules (OWASP ASVS v4.0 Level 1 + NIST SP 800-63B):
 *   - minimum 8 characters
 *   - at least one lowercase letter (a-z)
 *   - at least one uppercase letter (A-Z)
 *   - at least one digit (0-9)
 *   - at least one symbol (!@#$%^&*...)
 *   - no leading/trailing whitespace
 *   - not the user's email (basic no-reuse check)
 *
 * Email rules:
 *   - RFC-5322-lite: local-part + @ + domain, at least one dot in domain
 *   - no whitespace
 *   - length ≤ 254 (SMTP cap)
 *
 * Returned as a list of failure messages so the UI can show each one;
 * an empty list means the input is accepted.
 */

export function validateEmail(email: string): string[] {
  const e = email.trim();
  const errors: string[] = [];
  if (!e) { errors.push("Email is required."); return errors; }
  if (e.length > 254) errors.push("Email is too long.");
  if (/\s/.test(e)) errors.push("Email can't contain spaces.");
  // Pragmatic regex — rejects most malformed addresses without blocking
  // legitimate ones. Full RFC-5322 would allow quoted locals and IP-literal
  // domains which no sign-up form actually needs.
  if (!/^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(e)) errors.push("Enter a valid email like you@example.com.");
  return errors;
}

export interface PasswordCheck {
  ok: boolean;
  failures: string[];
  score: 0 | 1 | 2 | 3 | 4;   // 0 = empty, 4 = all rules + length ≥ 12
  label: "empty" | "weak" | "fair" | "good" | "strong";
}

export function checkPassword(password: string, email?: string): PasswordCheck {
  const failures: string[] = [];
  if (!password) {
    return { ok: false, failures: ["Password is required."], score: 0, label: "empty" };
  }
  if (password !== password.trim()) failures.push("No leading or trailing spaces.");
  if (password.length < 8) failures.push("At least 8 characters.");
  if (!/[a-z]/.test(password)) failures.push("One lowercase letter.");
  if (!/[A-Z]/.test(password)) failures.push("One uppercase letter.");
  if (!/\d/.test(password))    failures.push("One number.");
  // Symbol class is intentionally broad — we accept anything that isn't a
  // letter, digit, or whitespace, so `!@#$%^&*()-_=+[]{}|;:'",.<>/?` all work.
  if (!/[^A-Za-z0-9\s]/.test(password)) failures.push("One symbol (e.g. ! @ # ?).");

  if (email && password.toLowerCase().includes(email.split("@")[0].toLowerCase()) && email.split("@")[0].length >= 4) {
    failures.push("Password should not contain your email.");
  }

  const ok = failures.length === 0;
  const score: PasswordCheck["score"] =
    !ok ? (password.length < 6 ? 1 : 2)
    : password.length >= 12 ? 4
    : 3;
  const label: PasswordCheck["label"] =
    score === 1 ? "weak"
    : score === 2 ? "fair"
    : score === 3 ? "good"
    : "strong";  // score === 4 — the empty case was returned above
  return { ok, failures, score, label };
}

export function passwordsMatch(a: string, b: string): boolean {
  return a === b && a.length > 0;
}
