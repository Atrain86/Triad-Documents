# Triad Auto-Model Routing (Future Feature Idea)
## Status
Concept / Under Evaluation

## Summary
This document outlines an idea for a future enhancement to the Triad system — an automatic model-routing layer that detects context keywords in user prompts and dynamically switches LLM models across agents (Clive, Abacus, GPT).
The concept is intended to streamline workflows and reduce manual model switching during PaintBrain-style projects that mix planning, coding, and design tasks.

## Background
Currently, each agent in the Triad (Clive, Abacus, GPT) requires the user to manually select or switch models when changing between reasoning, design, or polish phases.
While manual control is valuable for precision, it can slow creative and technical flow during high-iteration tasks like:

- Converting screenshots to Tailwind/React components
- Debugging backend routes
- Planning architectural changes
- Performing visual QA refinements

This feature would automate those transitions based on intent cues in the conversation.

## Concept Overview
**Goal:**
Allow Triad agents to infer task intent (“planning,” “design,” “polish,” “debug,” etc.) and automatically choose the most suitable model.

**Proposed Flow:**

1. User message is parsed by a lightweight middleware (“Model Router”).
2. Middleware scans message for keywords or semantic context.
3. If a match is found, the active model for the next exchange switches automatically.
4. The system logs the detected mode and chosen model for transparency.

## Example Routing Map
| Mode                | Keyword Triggers                  | Model                          | Purpose                       |
|---------------------|-----------------------------------|--------------------------------|-------------------------------|
| Planning / Reasoning| plan, strategy, analyze, architecture | anthropic/claude-sonnet-4.5    | Deep reasoning, architecture design |
| Design / Visual Code| screenshot, layout, UI, convert, component | google/gemini-2.5-flash-image  | Vision + code generation      |
| Polish / QA         | refine, spacing, tailwind, finalize | anthropic/claude-sonnet-4.5    | Layout precision              |
| Debug / Backend     | error, stack, api, fix, log       | openai/gpt-4o                  | Reliable debugging            |
| Prototype / Draft   | mock, quick, test, mvp            | google/gemini-2.5-flash-lite   | Low-cost iteration            |

## Example Configuration Manifest (Future)
```json
{
  "routes": [
    { "match": "plan|strategy|architecture", "model": "anthropic/claude-sonnet-4.5" },
    { "match": "screenshot|layout|design|UI", "model": "google/gemini-2.5-flash-image" },
    { "match": "refine|polish|tailwind", "model": "anthropic/claude-sonnet-4.5" },
    { "match": "debug|stack|error|api", "model": "openai/gpt-4o" },
    { "match": "mock|quick|mvp", "model": "google/gemini-2.5-flash-lite" }
  ],
  "default_model": "google/gemini-2.5-flash-image"
}
```

## Benefits (Projected)
- Faster iteration without manual model selection
- Reduced cognitive overhead for multi-phase tasks
- Consistent routing logic across all Triad agents
- Cost efficiency by matching tasks to appropriate model tiers

## Implementation Notes (Future)
If developed, this would likely involve:

- A middleware or plugin layer integrated with Clive and Abacus
- A shared routing manifest in `/config/triad_routes.json`
- Optional CLI or keyword override commands (`/plan`, `/design`, `/polish`)
- Logging or visual indicator of active model

## Status & Next Steps
This concept is not yet in active development.
It should be stored as a future-development idea for review during Triad’s next system-feature planning cycle.
When ready, we can:

- Prototype a basic routing script.
- Benchmark response accuracy and cost.
- Integrate into the shared Triad agent infrastructure.

**Document Path:**
`/docs/ideas/triad_auto_model_routing_idea.md`
**Created by:** GPT-5 (for A-frame)
**Purpose:** Preserve concept for future Triad development and collaboration.
