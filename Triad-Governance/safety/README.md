# Triad Safety Directory

This directory contains safety mechanisms and emergency controls for the Triad system.

## Purpose
- Implements emergency manual and programmatic shutdown capabilities
- Monitors system resource usage and costs
- Prevents runaway processes and excessive spending
- Maintains audit logs of safety-related events

## Core Files
- `killswitch.js` - Emergency shutdown implementation
  - CPU usage monitoring
  - Token rate tracking
  - OpenRouter spend monitoring
  - Automatic termination when costs exceed $10/min
  - Incident logging to `logs/killswitch.log`
  - Act Mode locking until audit

## Features
- Real-time resource monitoring
- Cost threshold enforcement
- Automatic intervention triggers
- Incident reporting and logging
- Recovery protocol management

## Usage
The safety system provides critical safeguards against system overruns, excessive resource usage, and unexpected behaviors. It acts as the last line of defense in maintaining system stability and cost control.
