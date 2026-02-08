from __future__ import annotations


def normalize_phone_e164(value: str | None) -> str | None:
    """
    Best-effort phone normalization for E.164-like strings.

    - strips spaces and common separators
    - ensures leading '+'
    """
    if value is None:
        return None
    s = value.strip()
    if not s:
        return None
    for ch in (" ", "-", "(", ")", ".", "\u00a0"):
        s = s.replace(ch, "")
    if s and not s.startswith("+"):
        s = "+" + s
    return s

