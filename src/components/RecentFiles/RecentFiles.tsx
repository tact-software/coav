import React from 'react';
import { useRecentFilesStore, RecentFile } from '../../stores/useRecentFilesStore';
import './RecentFiles.css';

interface RecentFilesProps {
  onFileSelect: (file: RecentFile) => void;
}

const RecentFiles: React.FC<RecentFilesProps> = ({ onFileSelect }) => {
  const { recentFiles, removeRecentFile, clearRecentFiles, getRecentImages, getRecentAnnotations } =
    useRecentFilesStore();

  const recentImages = getRecentImages();
  const recentAnnotations = getRecentAnnotations();

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getFileIcon = (type: 'image' | 'annotation') => {
    if (type === 'image') {
      return (
        <svg className="recent-file-icon" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
      );
    } else {
      return (
        <svg className="recent-file-icon" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
  };

  const handleRemove = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    removeRecentFile(path);
  };

  if (recentFiles.length === 0) {
    return (
      <div className="recent-files">
        <div className="no-recent-files">No recent files</div>
      </div>
    );
  }

  return (
    <div className="recent-files">
      {recentImages.length > 0 && (
        <div className="recent-files-section">
          <div className="section-title">
            Recent Images
            <button
              className="clear-btn"
              onClick={() => recentImages.forEach((f) => removeRecentFile(f.path))}
              title="Clear recent images"
            >
              Clear
            </button>
          </div>
          {recentImages.slice(0, 5).map((file) => (
            <div
              key={file.path}
              className="recent-file-item"
              onClick={() => onFileSelect(file)}
              title={file.path}
            >
              {getFileIcon(file.type)}
              <div className="recent-file-info">
                <div className="recent-file-name">{file.name}</div>
                <div className="recent-file-path">{file.path}</div>
              </div>
              <div className="recent-file-time">{formatTime(file.lastOpened)}</div>
              <button
                className="remove-btn"
                onClick={(e) => handleRemove(e, file.path)}
                title="Remove from recent files"
              >
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {recentAnnotations.length > 0 && (
        <div className="recent-files-section">
          <div className="section-title">
            Recent Annotations
            <button
              className="clear-btn"
              onClick={() => recentAnnotations.forEach((f) => removeRecentFile(f.path))}
              title="Clear recent annotations"
            >
              Clear
            </button>
          </div>
          {recentAnnotations.slice(0, 5).map((file) => (
            <div
              key={file.path}
              className="recent-file-item"
              onClick={() => onFileSelect(file)}
              title={file.path}
            >
              {getFileIcon(file.type)}
              <div className="recent-file-info">
                <div className="recent-file-name">{file.name}</div>
                <div className="recent-file-path">{file.path}</div>
              </div>
              <div className="recent-file-time">{formatTime(file.lastOpened)}</div>
              <button
                className="remove-btn"
                onClick={(e) => handleRemove(e, file.path)}
                title="Remove from recent files"
              >
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {recentFiles.length > 0 && (
        <div className="recent-files-section">
          <button
            className="clear-btn"
            onClick={clearRecentFiles}
            style={{ width: '100%', textAlign: 'center' }}
          >
            Clear All Recent Files
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentFiles;
