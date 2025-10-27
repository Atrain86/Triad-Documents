# Triad Context Policy – Phase III-C

## Objective
Enable real-time synchronization of service state, metrics, and governance data across all Triad nodes.

## Core Rules
1. Context updates must comply with context_schema.json.
2. All updates are broadcast through triad_context_hub.js.
3. Context snapshots are written every 5 minutes as defined in context_sync.yaml.
4. Governance summaries are pushed to Triad-Docs hourly.
