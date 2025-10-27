# Triad Adaptive Policy – Phase III-B Prototype

## Purpose
Establish baseline principles for self-tuning and adaptive remediation across Triad services.

## Governance Directives
1. All adaptive updates must log changes to `logs/adaptive_events.log`.
2. Threshold modifications are restricted to ±0.5 of baseline values.
3. Feedback data older than 30 days is purged automatically.
4. Any autonomous configuration change triggers GitHub sync to Triad-Docs.
5. Human review required for z-score deviation > 5σ.

## Audit
Every update to `adaptive_config.yaml` must include:
- Timestamp  
- Originator (service ID or user)  
- Summary of parameter change  
- Validation hash
