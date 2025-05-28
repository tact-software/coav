import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore, generateCategoryColor } from '../../stores';
import { useAnnotationStore } from '../../stores';
import './ColorSettings.css';

export const ColorSettings: React.FC = () => {
  const { t } = useTranslation();
  const { colors, setCategoryColor, resetCategoryColors, updateColorSettings } = useSettingsStore();
  const { cocoData } = useAnnotationStore();

  const categories = cocoData?.categories || [];

  const handleColorChange = useCallback(
    (categoryId: number, color: string) => {
      setCategoryColor(categoryId, color);
    },
    [setCategoryColor]
  );

  const handleOpacityChange = useCallback(
    (key: keyof typeof colors, value: number) => {
      updateColorSettings({ [key]: value });
    },
    [colors, updateColorSettings]
  );

  const handleResetColors = useCallback(() => {
    if (window.confirm(t('colorSettings.confirmReset'))) {
      resetCategoryColors();
    }
  }, [resetCategoryColors, t]);

  return (
    <div className="color-settings">
      <div className="color-settings-section">
        <h3>{t('colorSettings.categoryColors')}</h3>
        <div className="category-color-list">
          {categories.map((category) => (
            <div key={category.id} className="category-color-item">
              <span className="category-name">{category.name}</span>
              <div className="color-picker-wrapper">
                <input
                  type="color"
                  value={colors.categoryColors[category.id] || generateCategoryColor(category.id)}
                  onChange={(e) => handleColorChange(category.id, e.target.value)}
                  className="color-picker"
                />
                <div
                  className="color-preview"
                  style={{
                    backgroundColor:
                      colors.categoryColors[category.id] || generateCategoryColor(category.id),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        {categories.length === 0 && (
          <p className="no-categories-message">{t('colorSettings.noCategories')}</p>
        )}
      </div>

      <div className="color-settings-section">
        <h3>{t('colorSettings.opacitySettings')}</h3>
        <div className="opacity-controls">
          <div className="opacity-control">
            <label>{t('colorSettings.fillOpacity')}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={colors.fillOpacity}
              onChange={(e) => handleOpacityChange('fillOpacity', parseFloat(e.target.value))}
            />
            <span className="opacity-value">
              {(colors.fillOpacity * 100).toFixed(0)}%{' '}
              {colors.fillOpacity === 0
                ? t('colorSettings.transparent')
                : colors.fillOpacity === 1
                  ? t('colorSettings.opaque')
                  : ''}
            </span>
          </div>

          <div className="opacity-control">
            <label>{t('colorSettings.selectedFillOpacity')}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={colors.selectedFillOpacity}
              onChange={(e) =>
                handleOpacityChange('selectedFillOpacity', parseFloat(e.target.value))
              }
            />
            <span className="opacity-value">
              {(colors.selectedFillOpacity * 100).toFixed(0)}%{' '}
              {colors.selectedFillOpacity === 0
                ? t('colorSettings.transparent')
                : colors.selectedFillOpacity === 1
                  ? t('colorSettings.opaque')
                  : ''}
            </span>
          </div>

          <div className="opacity-control">
            <label>{t('colorSettings.hoverFillOpacity')}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={colors.hoverFillOpacity}
              onChange={(e) => handleOpacityChange('hoverFillOpacity', parseFloat(e.target.value))}
            />
            <span className="opacity-value">
              {(colors.hoverFillOpacity * 100).toFixed(0)}%{' '}
              {colors.hoverFillOpacity === 0
                ? t('colorSettings.transparent')
                : colors.hoverFillOpacity === 1
                  ? t('colorSettings.opaque')
                  : ''}
            </span>
          </div>

          <div className="opacity-control">
            <label>{t('colorSettings.strokeOpacity')}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={colors.strokeOpacity}
              onChange={(e) => handleOpacityChange('strokeOpacity', parseFloat(e.target.value))}
            />
            <span className="opacity-value">
              {(colors.strokeOpacity * 100).toFixed(0)}%{' '}
              {colors.strokeOpacity === 0
                ? t('colorSettings.transparent')
                : colors.strokeOpacity === 1
                  ? t('colorSettings.opaque')
                  : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="color-settings-section">
        <h3>{t('colorSettings.comparisonColors')}</h3>
        <div className="comparison-color-settings">
          <div className="color-group">
            <h4>{t('colorSettings.groundTruth')}</h4>
            <div className="comparison-color-item">
              <label>{t('colorSettings.truePositive')}</label>
              <input
                type="color"
                value={colors.comparison?.gtColors.tp || '#4caf50'}
                onChange={(e) =>
                  updateColorSettings({
                    comparison: {
                      gtColors: {
                        tp: e.target.value,
                        fn: colors.comparison?.gtColors.fn || '#ff9800',
                      },
                      predColors: colors.comparison?.predColors || {
                        tp: '#66bb6a',
                        fp: '#f44336',
                      },
                    },
                  })
                }
                className="color-picker"
              />
            </div>
            <div className="comparison-color-item">
              <label>{t('colorSettings.falseNegative')}</label>
              <input
                type="color"
                value={colors.comparison?.gtColors.fn || '#ff9800'}
                onChange={(e) =>
                  updateColorSettings({
                    comparison: {
                      gtColors: {
                        tp: colors.comparison?.gtColors.tp || '#4caf50',
                        fn: e.target.value,
                      },
                      predColors: colors.comparison?.predColors || {
                        tp: '#66bb6a',
                        fp: '#f44336',
                      },
                    },
                  })
                }
                className="color-picker"
              />
            </div>
          </div>
          <div className="color-group">
            <h4>{t('colorSettings.prediction')}</h4>
            <div className="comparison-color-item">
              <label>{t('colorSettings.truePositive')}</label>
              <input
                type="color"
                value={colors.comparison?.predColors.tp || '#66bb6a'}
                onChange={(e) =>
                  updateColorSettings({
                    comparison: {
                      gtColors: colors.comparison?.gtColors || {
                        tp: '#4caf50',
                        fn: '#ff9800',
                      },
                      predColors: {
                        tp: e.target.value,
                        fp: colors.comparison?.predColors.fp || '#f44336',
                      },
                    },
                  })
                }
                className="color-picker"
              />
            </div>
            <div className="comparison-color-item">
              <label>{t('colorSettings.falsePositive')}</label>
              <input
                type="color"
                value={colors.comparison?.predColors.fp || '#f44336'}
                onChange={(e) =>
                  updateColorSettings({
                    comparison: {
                      gtColors: colors.comparison?.gtColors || {
                        tp: '#4caf50',
                        fn: '#ff9800',
                      },
                      predColors: {
                        tp: colors.comparison?.predColors.tp || '#66bb6a',
                        fp: e.target.value,
                      },
                    },
                  })
                }
                className="color-picker"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="color-settings-actions">
        <button onClick={handleResetColors} className="reset-button">
          {t('colorSettings.resetToDefault')}
        </button>
      </div>
    </div>
  );
};
