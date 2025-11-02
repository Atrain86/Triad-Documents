import React, { useState, useEffect } from 'react';
import { WebSocketContext } from '../WebSocketManager';

const VSClinePipeline = () => {
  const [pipelineStatus, setPipelineStatus] = useState({
    status: 'idle',
    currentTask: null,
    queuedTasks: [],
    lastProcessed: null,
    error: null
  });

  const [transformationRules, setTransformationRules] = useState({
    enabled: true,
    rules: [
      { type: 'vision_storm', target: 'cline_act' },
      { type: 'vision_plan', target: 'cline_plan' }
    ]
  });

  const ws = React.useContext(WebSocketContext);

  useEffect(() => {
    if (ws) {
      const handlePipelineMessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'pipeline_status') {
          setPipelineStatus(data.status);
        } else if (data.type === 'transformation_rules') {
          setTransformationRules(data.rules);
        }
      };

      ws.addEventListener('message', handlePipelineMessage);
      requestPipelineStatus();

      return () => ws.removeEventListener('message', handlePipelineMessage);
    }
  }, [ws]);

  const requestPipelineStatus = () => {
    if (ws) {
      ws.send({ type: 'get_pipeline_status' });
      ws.send({ type: 'get_transformation_rules' });
    }
  };

  const togglePipeline = () => {
    if (ws) {
      ws.send({
        type: 'pipeline_control',
        action: transformationRules.enabled ? 'disable' : 'enable',
        timestamp: Date.now()
      });
    }
  };

  const clearQueue = () => {
    if (ws) {
      ws.send({
        type: 'pipeline_control',
        action: 'clear_queue',
        timestamp: Date.now()
      });
    }
  };

  const retryFailedTask = () => {
    if (ws && pipelineStatus.error && pipelineStatus.currentTask) {
      ws.send({
        type: 'pipeline_control',
        action: 'retry_task',
        taskId: pipelineStatus.currentTask.id,
        timestamp: Date.now()
      });
    }
  };

  const getStatusColor = () => {
    switch (pipelineStatus.status) {
      case 'processing': return 'var(--pb-blue)';
      case 'error': return 'var(--pb-red)';
      case 'idle': return 'var(--pb-green)';
      default: return 'var(--pb-purple)';
    }
  };

  return (
    <div className="pipeline-container">
      <h2>VS-to-Cline Pipeline</h2>
      
      <div className="pipeline-controls">
        <div className="pipeline-status" style={{ borderColor: getStatusColor() }}>
          <span className="status-label">Status:</span>
          <span className="status-value" style={{ color: getStatusColor() }}>
            {pipelineStatus.status.toUpperCase()}
          </span>
        </div>
        
        <div className="control-buttons">
          <button
            className={`control-btn ${transformationRules.enabled ? 'stop' : 'start'}`}
            onClick={togglePipeline}
          >
            {transformationRules.enabled ? 'Disable Pipeline' : 'Enable Pipeline'}
          </button>
          <button
            className="control-btn system"
            onClick={clearQueue}
            disabled={pipelineStatus.queuedTasks.length === 0}
          >
            Clear Queue
          </button>
          {pipelineStatus.error && (
            <button
              className="control-btn start"
              onClick={retryFailedTask}
            >
              Retry Failed Task
            </button>
          )}
        </div>
      </div>

      {pipelineStatus.currentTask && (
        <div className="current-task">
          <h3>Current Task</h3>
          <div className="task-details">
            <div className="detail-row">
              <span className="label">ID:</span>
              <span className="value">{pipelineStatus.currentTask.id}</span>
            </div>
            <div className="detail-row">
              <span className="label">Type:</span>
              <span className="value">{pipelineStatus.currentTask.type}</span>
            </div>
            <div className="detail-row">
              <span className="label">Progress:</span>
              <span className="value">{pipelineStatus.currentTask.progress}%</span>
            </div>
          </div>
        </div>
      )}

      {pipelineStatus.error && (
        <div className="error-message">
          <h3>Error</h3>
          <pre>{pipelineStatus.error}</pre>
        </div>
      )}

      {pipelineStatus.queuedTasks.length > 0 && (
        <div className="queued-tasks">
          <h3>Queue ({pipelineStatus.queuedTasks.length})</h3>
          <div className="task-list">
            {pipelineStatus.queuedTasks.map((task, index) => (
              <div key={task.id} className="queued-task">
                <span className="task-type">{task.type}</span>
                <span className="task-id">{task.id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {pipelineStatus.lastProcessed && (
        <div className="last-processed">
          <h3>Last Processed</h3>
          <div className="task-details">
            <div className="detail-row">
              <span className="label">ID:</span>
              <span className="value">{pipelineStatus.lastProcessed.id}</span>
            </div>
            <div className="detail-row">
              <span className="label">Type:</span>
              <span className="value">{pipelineStatus.lastProcessed.type}</span>
            </div>
            <div className="detail-row">
              <span className="label">Time:</span>
              <span className="value">
                {new Date(pipelineStatus.lastProcessed.timestamp).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VSClinePipeline;
