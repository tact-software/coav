import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useAnnotationStore,
  useImageStore,
  useSettingsStore,
  generateCategoryColor,
} from '../../stores';
import { extractFieldsFromAnnotation, groupFieldsByCategory } from '../../utils';
import SearchBox, { SearchBoxRef } from '../SearchBox/SearchBox';
import './ControlPanel.css';

const ControlPanel: React.FC = () => {
  const { t } = useTranslation();
  const searchBoxRef = useRef<SearchBoxRef>(null);

  const {
    cocoData,
    currentImageId,
    visibleCategoryIds,
    toggleCategoryVisibility,
    showAllCategories,
    hideAllCategories,
  } = useAnnotationStore();

  const { imageSize, zoom, zoomIn, zoomOut, resetView, fitToWindow } = useImageStore();

  const { detail, updateDetailSettings, colors } = useSettingsStore();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['option']));

  // Handle Ctrl+F keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        searchBoxRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter annotations by current image
  const currentImageAnnotations = useMemo(() => {
    if (!cocoData?.annotations || !currentImageId) return [];
    return cocoData.annotations.filter((ann) => ann.image_id === currentImageId);
  }, [cocoData, currentImageId]);

  const annotationCounts = currentImageAnnotations.reduce(
    (acc, ann) => {
      acc[ann.category_id] = (acc[ann.category_id] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>
  );

  // Extract available fields from first annotation
  const availableFields = useMemo(() => {
    if (!cocoData?.annotations.length) return [];
    return extractFieldsFromAnnotation(cocoData.annotations[0]);
  }, [cocoData]);

  const fieldGroups = useMemo(() => {
    return groupFieldsByCategory(availableFields);
  }, [availableFields]);

  const toggleFieldSelection = (fieldPath: string) => {
    const newPromotedFields = detail.promotedFields.includes(fieldPath)
      ? detail.promotedFields.filter((f) => f !== fieldPath)
      : [...detail.promotedFields, fieldPath];

    updateDetailSettings({ promotedFields: newPromotedFields });
  };

  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const selectAllInCategory = (category: string) => {
    const categoryFields = fieldGroups[category] || [];
    const fieldsToAdd = categoryFields
      .filter((field) => field.type !== 'object')
      .map((field) => field.path)
      .filter((path) => !detail.promotedFields.includes(path));

    if (fieldsToAdd.length > 0) {
      updateDetailSettings({
        promotedFields: [...detail.promotedFields, ...fieldsToAdd],
      });
    }
  };

  const deselectAllInCategory = (category: string) => {
    const categoryFields = fieldGroups[category] || [];
    const fieldsToRemove = categoryFields.map((field) => field.path);

    updateDetailSettings({
      promotedFields: detail.promotedFields.filter((path) => !fieldsToRemove.includes(path)),
    });
  };

  return (
    <div className="control-panel">
      {/* View Controls - Show when image is loaded */}
      {imageSize && (
        <div className="panel-section">
          <div className="section-header">
            <h4>{t('controls.viewControls')}</h4>
          </div>
          <div className="zoom-controls-grid">
            <button
              className="btn btn-secondary btn-icon"
              onClick={zoomOut}
              title={t('menu.zoomOut')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35M8 11h6" />
              </svg>
            </button>
            <div className="zoom-display">
              <span>{Math.round(zoom * 100)}%</span>
            </div>
            <button
              className="btn btn-secondary btn-icon"
              onClick={zoomIn}
              title={t('menu.zoomIn')}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
              </svg>
            </button>
            <button className="btn btn-secondary" onClick={fitToWindow}>
              {t('controls.fit')}
            </button>
            <button className="btn btn-secondary" onClick={resetView}>
              100%
            </button>
          </div>
        </div>
      )}

      {/* Search - Show when annotations are loaded */}
      {cocoData && (
        <>
          <div className="panel-section">
            <div className="section-header">
              <h4>{t('controls.search')}</h4>
            </div>
            <SearchBox ref={searchBoxRef} />
          </div>

          <div className="panel-section">
            <div className="section-header">
              <h4>{t('controls.categories')}</h4>
              <div className="section-actions">
                <button className="btn-text" onClick={showAllCategories}>
                  {t('controls.all')}
                </button>
                <span className="separator">|</span>
                <button className="btn-text" onClick={hideAllCategories}>
                  {t('controls.none')}
                </button>
              </div>
            </div>
            <div className="category-list">
              {cocoData.categories
                .filter((category) => {
                  // Only show categories that have annotations in the current image
                  return annotationCounts[category.id] > 0;
                })
                .map((category) => {
                  const count = annotationCounts[category.id] || 0;
                  const isVisible = visibleCategoryIds.includes(category.id);
                  const categoryColor =
                    colors.categoryColors[category.id] || generateCategoryColor(category.id);

                  return (
                    <label
                      key={category.id}
                      className={`category-item ${!isVisible ? 'disabled' : ''}`}
                    >
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={isVisible}
                        onChange={() => toggleCategoryVisibility(category.id)}
                      />
                      <div className="category-color" style={{ backgroundColor: categoryColor }} />
                      <span className="category-name">{category.name}</span>
                      <span className="category-count badge">{count}</span>
                    </label>
                  );
                })}
            </div>
          </div>

          <div className="panel-section">
            <div className="section-header">
              <h4>{t('controls.statistics')}</h4>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{currentImageAnnotations.length}</div>
                  <div className="stat-label">{t('controls.annotations')}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 11H3v10h6V11zM15 3H9v18h6V3zM21 7h-6v14h6V7z" />
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{Object.keys(annotationCounts).length}</div>
                  <div className="stat-label">{t('controls.categories')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Detail Display Settings - Show when annotations are loaded and have extended fields */}
          {availableFields.length > 0 && (
            <div className="panel-section">
              <div className="section-header">
                <h4>{t('controls.detailDisplay')}</h4>
                <div className="section-actions">
                  <button
                    className="btn-text"
                    onClick={() =>
                      updateDetailSettings({
                        promotedFields: availableFields
                          .filter((f) => f.type !== 'object')
                          .map((f) => f.path),
                      })
                    }
                  >
                    {t('controls.all')}
                  </button>
                  <span className="separator">|</span>
                  <button
                    className="btn-text"
                    onClick={() => updateDetailSettings({ promotedFields: [] })}
                  >
                    {t('controls.none')}
                  </button>
                </div>
              </div>
              <div className="field-groups">
                {Object.entries(fieldGroups).map(([category, fields]) => {
                  const isExpanded = expandedCategories.has(category);
                  const primitiveFields = fields.filter((f) => f.type !== 'object');
                  const selectedCount = primitiveFields.filter((f) =>
                    detail.promotedFields.includes(f.path)
                  ).length;

                  return (
                    <div key={category} className="field-group">
                      <div
                        className="field-group-header"
                        onClick={() => toggleCategoryExpansion(category)}
                      >
                        <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
                        <span className="group-name">{category}</span>
                        <span className="field-count badge">
                          {selectedCount}/{primitiveFields.length}
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="field-group-content">
                          <div className="field-group-actions">
                            <button
                              className="btn-text-small"
                              onClick={() => selectAllInCategory(category)}
                            >
                              {t('controls.selectAll')}
                            </button>
                            <span className="separator">|</span>
                            <button
                              className="btn-text-small"
                              onClick={() => deselectAllInCategory(category)}
                            >
                              {t('controls.selectNone')}
                            </button>
                          </div>

                          <div className="field-list">
                            {primitiveFields.map((field) => (
                              <label key={field.path} className="field-item">
                                <input
                                  type="checkbox"
                                  className="checkbox-small"
                                  checked={detail.promotedFields.includes(field.path)}
                                  onChange={() => toggleFieldSelection(field.path)}
                                />
                                <span className="field-name" title={field.path}>
                                  {field.displayName}
                                </span>
                                <span className="field-type">{field.type}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Show empty state when no image is loaded */}
      {!imageSize && !cocoData && (
        <div className="empty-panel">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p>{t('info.noImageLoaded')}</p>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
