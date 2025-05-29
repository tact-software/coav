import React from 'react';
import './LoadingOverlay.css';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  progress?: number;
  subMessage?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = 'Processing...',
  progress,
  subMessage,
}) => {
  if (!isLoading) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="loading-spinner" />
        <div className="loading-message">{message}</div>
        {subMessage && <div className="loading-sub-message">{subMessage}</div>}
        {progress !== undefined && (
          <div className="loading-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <div className="progress-text">{Math.round(progress)}%</div>
          </div>
        )}
      </div>
    </div>
  );
};
