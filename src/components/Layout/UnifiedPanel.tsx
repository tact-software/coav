import { ReactNode } from 'react';
import { TabIcon, useTabTitle } from './TabHelpers';
import type { TabType } from '../../stores';

interface UnifiedPanelProps {
  tabs: TabType[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onClose: () => void;
  isHorizontal: boolean;
  renderContent: (tab: string) => ReactNode;
}

export function UnifiedPanel({
  tabs,
  activeTab,
  onTabChange,
  onClose,
  isHorizontal,
  renderContent,
}: UnifiedPanelProps) {
  const getTabTitle = useTabTitle();

  return (
    <aside
      className={`unified-panel unified-panel--overlay unified-panel--visible ${isHorizontal ? 'unified-panel--horizontal' : 'unified-panel--vertical'}`}
    >
      <div className="unified-panel-backdrop" onClick={onClose} />
      <div className="unified-panel-container">
        <div className="unified-panel-header">
          <div className="unified-panel-tabs">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => onTabChange(tab)}
              >
                <TabIcon tab={tab} />
                {!isHorizontal && getTabTitle(tab)}
              </button>
            ))}
          </div>
          <button className="unified-panel-close" onClick={onClose}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="unified-panel-content">{renderContent(activeTab)}</div>
      </div>
    </aside>
  );
}
