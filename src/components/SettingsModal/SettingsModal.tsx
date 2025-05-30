import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore, Language, Theme } from '../../stores';
import { ColorSettings } from '../ColorSettings';
import { CommonModal } from '../CommonModal';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'general' | 'display' | 'panel' | 'colors'>('general');

  // Helper to get tab name
  const getTabName = (tab: string) => {
    switch (tab) {
      case 'control':
        return t('controls.title');
      case 'info':
        return t('info.title');
      case 'detail':
        return t('detail.title');
      case 'files':
        return t('files.recentFiles');
      default:
        return tab;
    }
  };
  const {
    language,
    theme,
    display,
    panelLayout,
    setLanguage,
    setTheme,
    updateDisplaySettings,
    updatePanelLayout,
    resetSettings,
  } = useSettingsStore();

  // Local state for form
  const [localSettings, setLocalSettings] = useState({
    language,
    theme,
    display: { ...display },
    panelLayout: { ...panelLayout },
  });

  // Update local state when store changes
  useEffect(() => {
    setLocalSettings({
      language,
      theme,
      display: { ...display },
      panelLayout: { ...panelLayout },
    });
  }, [language, theme, display, panelLayout]);

  const handleSave = () => {
    setLanguage(localSettings.language);
    setTheme(localSettings.theme);
    updateDisplaySettings(localSettings.display);
    updatePanelLayout(localSettings.panelLayout);
    onClose();
  };

  const handleReset = () => {
    if (window.confirm(t('settings.confirmReset'))) {
      resetSettings();
      onClose();
    }
  };

  return (
    <CommonModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('settings.title')}
      size="lg"
      hasBlur={true}
      footer={
        <>
          <button className="btn btn-secondary" onClick={handleReset}>
            {t('settings.reset')}
          </button>
          <div className="footer-actions">
            <button className="btn btn-secondary" onClick={onClose}>
              {t('settings.cancel')}
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              {t('settings.save')}
            </button>
          </div>
        </>
      }
    >
      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          {t('settings.general')}
        </button>
        <button
          className={`settings-tab ${activeTab === 'display' ? 'active' : ''}`}
          onClick={() => setActiveTab('display')}
        >
          {t('settings.display')}
        </button>
        <button
          className={`settings-tab ${activeTab === 'panel' ? 'active' : ''}`}
          onClick={() => setActiveTab('panel')}
        >
          {t('settings.panelLayout')}
        </button>
        <button
          className={`settings-tab ${activeTab === 'colors' ? 'active' : ''}`}
          onClick={() => setActiveTab('colors')}
        >
          {t('settings.colors')}
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'general' && (
          <section className="settings-section">
            <div className="settings-grid">
              <div className="setting-card">
                <label className="setting-label" htmlFor="language">
                  {t('settings.language')}
                </label>
                <select
                  id="language"
                  value={localSettings.language}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, language: e.target.value as Language })
                  }
                >
                  <option value="ja">日本語</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="setting-card">
                <label className="setting-label" htmlFor="theme">
                  {t('settings.theme')}
                </label>
                <select
                  id="theme"
                  value={localSettings.theme}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, theme: e.target.value as Theme })
                  }
                >
                  <option value="light">{t('settings.themeLight')}</option>
                  <option value="dark">{t('settings.themeDark')}</option>
                  <option value="system">{t('settings.themeSystem')}</option>
                </select>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'display' && (
          <section className="settings-section">
            <div className="setting-card">
              <div className="toggle-group">
                <div className="toggle-item">
                  <span className="toggle-label">{t('settings.showLabels')}</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={localSettings.display.showLabels}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          display: { ...localSettings.display, showLabels: e.target.checked },
                        })
                      }
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="toggle-item">
                  <span className="toggle-label">{t('settings.showBoundingBoxes')}</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={localSettings.display.showBoundingBoxes}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          display: {
                            ...localSettings.display,
                            showBoundingBoxes: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="slider-setting">
                <div className="slider-header">
                  <span className="slider-label">{t('settings.lineWidth')}</span>
                  <span className="slider-value">{localSettings.display.lineWidth}px</span>
                </div>
                <div className="slider-track">
                  <div
                    className="slider-fill"
                    style={{ width: `${((localSettings.display.lineWidth - 1) / 4) * 100}%` }}
                  />
                  <div
                    className="slider-thumb"
                    style={{ left: `${((localSettings.display.lineWidth - 1) / 4) * 100}%` }}
                  />
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    value={localSettings.display.lineWidth}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        display: {
                          ...localSettings.display,
                          lineWidth: parseFloat(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'panel' && (
          <section className="settings-section">
            <div className="panel-layout-settings">
              <div className="panel-config">
                <h4>{t('settings.leftPanel')}</h4>
                <div className="tab-list">
                  {localSettings.panelLayout.leftPanelTabs.map((tab) => (
                    <div key={tab} className="tab-item">
                      <span>{getTabName(tab)}</span>
                      <button
                        className="btn-icon"
                        onClick={() => {
                          const newLayout = { ...localSettings.panelLayout };
                          newLayout.leftPanelTabs = newLayout.leftPanelTabs.filter(
                            (t) => t !== tab
                          );
                          newLayout.rightPanelTabs.push(tab);
                          setLocalSettings({ ...localSettings, panelLayout: newLayout });
                        }}
                        title={t('settings.moveToRightPanel')}
                      >
                        →
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel-config">
                <h4>{t('settings.rightPanel')}</h4>
                <div className="tab-list">
                  {localSettings.panelLayout.rightPanelTabs.map((tab) => (
                    <div key={tab} className="tab-item">
                      <span>{getTabName(tab)}</span>
                      <button
                        className="btn-icon"
                        onClick={() => {
                          const newLayout = { ...localSettings.panelLayout };
                          newLayout.rightPanelTabs = newLayout.rightPanelTabs.filter(
                            (t) => t !== tab
                          );
                          newLayout.leftPanelTabs.push(tab);
                          setLocalSettings({ ...localSettings, panelLayout: newLayout });
                        }}
                        title={t('settings.moveToLeftPanel')}
                      >
                        ←
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'colors' && (
          <section className="settings-section">
            <ColorSettings />
          </section>
        )}
      </div>
    </CommonModal>
  );
};

export default SettingsModal;
