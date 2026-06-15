---
description: Greptile-style PR review with severity + confidence scores and committable suggestions
---

Review pull request $ARGUMENTS.

Be concise and high-signal. Only flag things that matter: bugs, security
issues, correctness problems, performance regressions, and maintainability
risks. Do not nitpick formatting or restate what the code obviously does.

For EACH issue, leave an INLINE comment on the exact line(s) in this format:

**[<severity>] <one-line title>**  ·  Confidence: <0–100>%
<1–2 sentence explanation of the problem and why it matters>

Where <severity> is one of: 🔴 Critical, 🟠 Major, 🟡 Minor, 🔵 Nit.
Confidence reflects how sure you are the issue is real and worth acting on.
Skip anything below ~50% confidence.

Whenever a fix is concrete, include a committable GitHub suggestion block so
the author can apply it in one click:

```suggestion
<the corrected code>
```

End with a single summary comment containing:
- A one-line verdict: ✅ Approve / 🟡 Approve with comments / 🔴 Request changes
- A table of every issue: | File:line | Severity | Confidence | Issue |
- Total count by severity.
