#!/bin/bash
echo "🔁 Restoring Triad Stable Configuration (Phase V-C)..."
cd ~/Documents/AI_LOCAL/Triad-Network && pkill -f "node server.js"
cd ~/Documents/AI_LOCAL/PaintBrain7/Triad-Network && node server.js &
cd ~/Documents/AI_LOCAL/PaintBrain7/Triad-Dashboard && npm run dev &
echo "✅ Triad network and dashboard relaunched."
echo "🔒 Token Chunker active, Resilience mode ON."
