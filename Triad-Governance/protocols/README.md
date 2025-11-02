# Triad Protocols Directory

This directory contains protocol implementations for the Triad Governance Layer.

## Purpose
- Implements GPT ↔ Opus conversation protocols
- Manages one-speaker-at-a-time queue
- Enforces token and time boundaries
- Handles incremental revision logic
- Maintains session checksum sync

## Core Files
- `bounded-dialogue.js` - Main protocol implementation
- Additional protocol files as needed

## Usage
Protocol files are used to enforce communication rules and boundaries between system components, ensuring orderly and efficient interaction between GPT-5, Opus, and other system elements.
