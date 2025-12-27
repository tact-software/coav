import { ReactNode } from 'react';
import { TabIcon, useTabTitle } from './TabHelpers';
import type { TabType } from '../../stores';

interface SidebarProps {
  tabs: TabType[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  layout: 'docked' | 'overlay';
  visible: boolean;
  onToggle: () => void;
  renderContent: (tab: string) => ReactNode;
}

export function Sidebar({
  tabs,
  activeTab,
  onTabChange,
  layout,
  visible,
  onToggle,
  renderContent,
}: SidebarProps) {
  const getTabTitle = useTabTitle();

  if (tabs.length === 0) return null;

  return (
    <aside className={`sidebar sidebar--${layout} ${visible ? 'sidebar--visible' : ''}`}>
      {layout === 'overlay' && visible && <div className="sidebar-backdrop" onClick={onToggle} />}
      <div className="sidebar-container">
        <div className="sidebar-header">
          <div className="sidebar-tabs">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => onTabChange(tab)}
              >
                <TabIcon tab={tab} />
                {getTabTitle(tab)}
              </button>
            ))}
          </div>
        </div>
        <div className="sidebar-content">{renderContent(activeTab)}</div>
      </div>
    </aside>
  );
}
