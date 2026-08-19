---
title: "Malicious Markdown regression fixture"
url: "/malicious-markdown-fixture/"
---

Safe fixture marker: ordinary Markdown must remain visible.

<script>window.fixtureScriptExecuted = true;</script>

<iframe src="https://attacker.invalid/embed"></iframe>

<img src="x" onerror="window.fixtureImageExecuted = true">

<svg onload="window.fixtureSVGExecuted = true"><script>alert(1)</script></svg>

[Unsafe protocol](javascript:alert(1))

<a href="data:text/html,unsafe">Unsafe data link</a>
