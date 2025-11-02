# Triad Governance Layer

This is the core governance layer for the Triad system, implementing the principles outlined in the Triad Bible V5 and related governance documents.

## Directory Structure

### 📂 [protocols/](./protocols)
- Implements GPT ↔ Opus conversation protocols
- Manages communication boundaries and queues
- Enforces token and time limits
- Core file: `bounded-dialogue.js`

### 📂 [context/](./context)
- Manages persistent operational memory
- Maintains vector store cache
- Handles session management
- Core file: `memory.js`

### 📂 [safety/](./safety)
- Implements emergency shutdown mechanisms
- Monitors system resources and costs
- Prevents excessive resource usage
- Core file: `killswitch.js`

### 📂 [telemetry/](./telemetry)
- Collects system health metrics
- Maintains WebSocket heartbeat
- Tracks agent status
- Core file: `monitor.js`

### 📂 [logs/](./logs)
- Records system activity
- Stores incident reports
- Maintains audit trails
- Core file: `triad_activity.log`

## Implementation Status

Current Phase: **Phase 1 - Governance Foundation**
- ✅ Directory structure established
- ✅ Documentation completed
- ⏳ Module implementation pending
- ⏳ Integration testing pending

## Governance Documents

The following documents define the operational framework:
1. [TRIAD_WORKFLOW_RULESET.md](../documentation/governance/TRIAD_WORKFLOW_RULESET.md)
2. [TRIAD_PHASE_III_PLAN.md](../documentation/governance/TRIAD_PHASE_III_PLAN.md)
3. [TRIAD_API_GOVERNANCE.md](../documentation/governance/TRIAD_API_GOVERNANCE.md)
4. [triad-dashboard-status-report-2025-11-01.md](../documentation/governance/triad-dashboard-status-report-2025-11-01.md)

## Usage

The governance layer provides:
- Communication protocol enforcement
- Context persistence and synchronization
- Safety controls and monitoring
- System telemetry and health tracking
- Comprehensive logging and auditing

## Development

All changes must follow the Triad Workflow Ruleset:
1. Begin with Pre-Toggle Alignment Report
2. Follow GPT-5 → Cline → Atrain workflow
3. Maintain comprehensive logging
4. Respect safety boundaries

## Safety Controls

The system includes multiple safety mechanisms:
- Cost monitoring ($10/min threshold)
- Resource usage limits
- Emergency shutdown procedures
- Audit logging

## Monitoring

Real-time system monitoring includes:
- WebSocket heartbeat (30s intervals)
- Agent status tracking
- Resource usage metrics
- Alert condition detection

---

*This implementation follows the Triad Bible V5 — The Embodied Architecture*
