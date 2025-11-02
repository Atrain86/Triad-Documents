# Triad Telemetry Directory

This directory manages system monitoring and health tracking for the Triad system.

## Purpose
- Implements continuous ping and health collection
- Maintains WebSocket heartbeat monitoring
- Tracks agent status pulses
- Reports system health to console and logs

## Core Files
- `monitor.js` - Core telemetry implementation
  - WebSocket heartbeat (30-second intervals)
  - Agent status tracking (blue, purple, orange, yellow)
  - System health reporting
  - Performance metrics collection

## Features
- Real-time health monitoring
- Agent status tracking
- Performance metrics
- System state reporting
- Alert condition detection

## Status Colors
- **Blue**: System operating normally
- **Purple**: High load but stable
- **Orange**: Warning condition
- **Yellow**: Critical condition

## Usage
The telemetry system provides real-time visibility into system health and performance, enabling proactive monitoring and rapid response to potential issues.
