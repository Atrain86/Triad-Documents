# Triad Workflow Ruleset

## Purpose
Define the operational structure for coordination between GPT, Cline, and all Triad components.

## Rule Tiers

### 1. Alignment Rules
- All changes begin with a **Pre-Toggle Alignment Report**.
- GPT provides strategic intent; Cline executes and reports results.
- No code is altered without documented confirmation.

### 2. Execution Rules
- Cline may attempt **up to 3 consecutive fixes** before triggering a GPT Review Loop.
- Each execution must end with:


Task Completed

<Title>
- Reports automatically append to the project's `PROGRESS_REPORT.md`.

### 3. Diagnostics Rules
- CPU, tsserver, or deployment issues trigger **Diagnostic Mode**.
- Diagnostic results are documented and timestamped.
- Post-diagnostic recovery steps are logged in the relevant node's report.

### 4. Communication Rules
- GPT and Cline maintain distinct but synchronized perspectives.
- Pre-Toggle → Act Mode → Post-Report is the core operational rhythm.
- GPT uses "Pre-Toggle Meeting" terminology; Cline uses "Execution Session."

_Last updated: October 26, 2025_
