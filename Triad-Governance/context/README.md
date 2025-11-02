# Triad Context Directory

This directory manages persistent operational memory for the Triad system.

## Purpose
- Establishes persistent "Operational RAM"
- Maintains local vector store cache
- Manages session hash IDs
- Verifies governance checksums

## Core Files
- `memory.js` - Core context management implementation
  - `loadContext()` - Load context from persistent storage
  - `saveContext()` - Save context to persistent storage
  - `verifyChecksum()` - Verify context integrity

## Features
- Vector-based context storage
- Session persistence
- Checksum verification against Bible digest
- Memory consolidation and retrieval
- Context synchronization between components

## Usage
The context system ensures continuity and coherence across Triad operations by maintaining a reliable state and memory system that survives beyond individual sessions.
