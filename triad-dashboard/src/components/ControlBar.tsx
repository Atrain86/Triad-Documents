import React from 'react';

interface ControlBarProps {
  onRunCommand: () => void;
  onSaveSnapshot: () => void;
  onKillSwitch: () => void;
}

const ControlBar: React.FC<ControlBarProps> = ({
  onRunCommand,
  onSaveSnapshot,
  onKillSwitch
}) => {
  return (
    <div className="flex gap-4 bg-gray-900 p-4 rounded-lg border border-aframeBlue">
      <button
        onClick={onRunCommand}
        className="px-4 py-2 bg-aframeBlue text-white rounded hover:bg-opacity-80 transition-colors"
      >
        Run Command
      </button>
      <button
        onClick={onSaveSnapshot}
        className="px-4 py-2 bg-aframeYellow text-black rounded hover:bg-opacity-80 transition-colors"
      >
        Save Snapshot
      </button>
      <button
        onClick={onKillSwitch}
        className="px-4 py-2 bg-aframeRed text-white rounded hover:bg-opacity-80 transition-colors"
      >
        KillSwitch
      </button>
    </div>
  );
};

export default ControlBar;
