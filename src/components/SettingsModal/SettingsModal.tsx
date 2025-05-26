import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore, Language, Theme } from '../../stores';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { language, theme, display, setLanguage, setTheme, updateDisplaySettings, resetSettings } =
    useSettingsStore();

  // Local state for form
  const [localSettings, setLocalSettings] = useState({
    language,
    theme,
    display: { ...display },
  });

  // Update local state when store changes
  useEffect(() => {
    setLocalSettings({
      language,
      theme,
      display: { ...display },
    });
  }, [language, theme, display]);

  if (!isOpen) return null;

  const handleSave = () => {
    setLanguage(localSettings.language);
    setTheme(localSettings.theme);
    updateDisplaySettings(localSettings.display);
    onClose();
  };

  const handleReset = () => {
    if (window.confirm(t('settings.confirmReset'))) {
      resetSettings();
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="settings-dialog-overlay" onClick={handleBackdropClick}>
      <div className="settings-dialog">
        <div className="settings-dialog-header">
          <h2>{t('settings.title')}</h2>
          <button className="settings-dialog-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="settings-dialog-content">
          {/* General Settings */}
          <section className="settings-section">
            <h3>{t('menu.settings')}</h3>

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

          {/* Display Settings */}
          <section className="settings-section">
            <h3>{t('settings.display')}</h3>

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
                  <span className="slider-label">{t('settings.opacity')}</span>
                  <span className="slider-value">
                    {(localSettings.display.annotationOpacity * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="slider-track">
                  <div
                    className="slider-fill"
                    style={{ width: `${localSettings.display.annotationOpacity * 100}%` }}
                  />
                  <div
                    className="slider-thumb"
                    style={{ left: `${localSettings.display.annotationOpacity * 100}%` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={localSettings.display.annotationOpacity}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        display: {
                          ...localSettings.display,
                          annotationOpacity: parseFloat(e.target.value),
                        },
                      })
                    }
                  />
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
        </div>

        <div className="settings-dialog-footer">
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
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
