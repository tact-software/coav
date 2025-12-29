import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useAnnotationStore,
  useImageStore,
  useSettingsStore,
  useModeStore,
  useEditorStore,
  useHistoryStore,
  generateCategoryColor,
} from '../../stores';
import { useFileOperations } from '../../hooks/useFileOperations';
import { extractFieldsFromAnnotation, groupFieldsByCategory } from '../../utils';
import { ModeSelector } from '../ModeSelector';
import SearchBox, { SearchBoxRef } from '../SearchBox/SearchBox';
import type { EditorTool, EditAction } from '../../types';
import type { EditableAnnotation } from '../../types/editor';
import './ControlPanel.css';

interface ControlPanelProps {
  onOpenComparisonDialog?: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ onOpenComparisonDialog }) => {
  const { t } = useTranslation();
  const searchBoxRef = useRef<SearchBoxRef>(null);
  const { handleSaveAnnotations } = useFileOperations();

  // Mode state
  const mode = useModeStore((state) => state.mode);

  // Editor state for annotation mode
  const currentTool = useEditorStore((state) => state.currentTool);
  const setTool = useEditorStore((state) => state.setTool);
  const hasChanges = useEditorStore((state) => state.hasChanges);
  const currentCategoryId = useEditorStore((state) => state.currentCategoryId);
  const setCurrentCategoryId = useEditorStore((state) => state.setCurrentCategoryId);

  // History state
  const canUndo = useHistoryStore((state) => state.canUndo());
  const canRedo = useHistoryStore((state) => state.canRedo());
  const undoHistory = useHistoryStore((state) => state.undo);
  const redoHistory = useHistoryStore((state) => state.redo);
  const pushHistory = useHistoryStore((state) => state.push);

  const {
    cocoData,
    currentImageId,
    visibleCategoryIds,
    toggleCategoryVisibility,
    showAllCategories,
    hideAllCategories,
    isComparing,
    clearComparison,
    diffFilters,
    toggleDiffFilter,
    comparisonSettings,
    selectedAnnotationIds,
    getSelectedAnnotations,
    addAnnotation,
    deleteAnnotation,
    updateAnnotation,
  } = useAnnotationStore();

  const { imageSize, zoom, zoomIn, zoomOut, resetView, fitToWindow } = useImageStore();

  const { detail, updateDetailSettings, colors } = useSettingsStore();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['option']));

  // Annotation mode categories
  const categories = cocoData?.categories ?? [];

  // Set initial category
  useEffect(() => {
    if (mode === 'annotation' && currentCategoryId === null && categories.length > 0) {
      setCurrentCategoryId(categories[0].id);
    }
  }, [mode, categories, currentCategoryId, setCurrentCategoryId]);

  // Apply action for undo/redo
  const applyAction = useCallback(
    (action: EditAction, isUndo: boolean) => {
      switch (action.type) {
        case 'CREATE':
          if (isUndo) {
            deleteAnnotation(action.annotation.id);
          } else {
            addAnnotation(action.annotation);
          }
          break;
        case 'DELETE':
          if (isUndo) {
            addAnnotation(action.annotation);
          } else {
            deleteAnnotation(action.annotation.id);
          }
          break;
        case 'UPDATE':
          if (isUndo) {
            updateAnnotation(action.id, action.before);
          } else {
            updateAnnotation(action.id, action.after);
          }
          break;
        case 'BATCH':
          const actions = isUndo ? [...action.actions].reverse() : action.actions;
          actions.forEach((a) => applyAction(a, isUndo));
          break;
      }
    },
    [addAnnotation, deleteAnnotation, updateAnnotation]
  );

  const handleUndo = useCallback(() => {
    const entry = undoHistory();
    if (entry) {
      applyAction(entry.action, true);
    }
  }, [undoHistory, applyAction]);

  const handleRedo = useCallback(() => {
    const entry = redoHistory();
    if (entry) {
      applyAction(entry.action, false);
    }
  }, [redoHistory, applyAction]);

  const handleDelete = useCallback(() => {
    const selectedAnnotations = getSelectedAnnotations();
    if (selectedAnnotations.length === 0) return;

    if (selectedAnnotations.length === 1) {
      const ann = selectedAnnotations[0];
      const editableAnn: EditableAnnotation = { ...ann, zIndex: 0 };
      pushHistory({ type: 'DELETE', annotation: editableAnn }, 'アノテーションを削除');
      deleteAnnotation(ann.id);
    } else {
      const deleteActions: EditAction[] = selectedAnnotations.map((ann) => ({
        type: 'DELETE' as const,
        annotation: { ...ann, zIndex: 0 } as EditableAnnotation,
      }));
      pushHistory({ type: 'BATCH', actions: deleteActions }, `${selectedAnnotations.length}件のアノテーションを削除`);
      selectedAnnotations.forEach((ann) => deleteAnnotation(ann.id));
    }
  }, [getSelectedAnnotations, deleteAnnotation, pushHistory]);

  const handleSave = useCallback(() => {
    handleSaveAnnotations();
  }, [handleSaveAnnotations]);

  const hasSelection = selectedAnnotationIds.length > 0;
  const isDrawingMode = currentTool !== 'select';

  // アノテーション追加ボタンの定義
  const addAnnotationButtons: { key: EditorTool; icon: React.ReactNode; label: string; shortcut: string }[] = [
    {
      key: 'bbox',
      label: t('editor.tools.bbox'),
      shortcut: 'B',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      ),
    },
    {
      key: 'polygon',
      label: t('editor.tools.polygon'),
      shortcut: 'P',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
        </svg>
      ),
    },
  ];

  // 描画モード開始
  const startDrawingMode = useCallback((tool: EditorTool) => {
    setTool(tool);
  }, [setTool]);

  // 描画モードキャンセル（選択モードに戻る）
  const cancelDrawingMode = useCallback(() => {
    setTool('select');
  }, [setTool]);

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

  // Render annotation mode controls
  const renderAnnotationControls = () => (
    <>
      {/* Drawing Mode Indicator */}
      {isDrawingMode && (
        <div className="panel-section drawing-mode-section">
          <div className="drawing-mode-indicator">
            <span className="drawing-mode-label">
              {currentTool === 'bbox' ? t('editor.tools.bbox') : t('editor.tools.polygon')}
              {t('editor.drawingMode')}
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={cancelDrawingMode}
            >
              {t('common.cancel')}
            </button>
          </div>
          <div className="drawing-mode-hint">
            {currentTool === 'bbox'
              ? t('editor.hints.bbox')
              : t('editor.hints.polygon')}
          </div>
        </div>
      )}

      {/* Add Annotation */}
      {!isDrawingMode && (
        <div className="panel-section">
          <div className="section-header">
            <h4>{t('editor.addAnnotation')}</h4>
          </div>
          <div className="annotation-add-buttons">
            {addAnnotationButtons.map(({ key, icon, label, shortcut }) => (
              <button
                key={key}
                type="button"
                className="annotation-add-button"
                onClick={() => startDrawingMode(key)}
                title={`${label} (${shortcut})`}
              >
                {icon}
                <span className="annotation-add-button-label">{label}</span>
                <span className="annotation-add-button-shortcut">{shortcut}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category Selection */}
      {categories.length > 0 && (
        <div className="panel-section">
          <div className="section-header">
            <h4>{t('editor.selectCategory')}</h4>
          </div>
          <div className="annotation-category-selector">
            <select
              className="category-select"
              value={currentCategoryId ?? ''}
              onChange={(e) => setCurrentCategoryId(Number(e.target.value))}
              aria-label={t('editor.selectCategory')}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <div
              className="category-color-indicator"
              style={{ backgroundColor: generateCategoryColor(currentCategoryId ?? 1) }}
            />
          </div>
        </div>
      )}

      {/* Edit Actions */}
      <div className="panel-section">
        <div className="section-header">
          <h4>{t('editor.actions')}</h4>
        </div>
        <div className="annotation-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleUndo}
            disabled={!canUndo}
            title={t('editor.undo')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
            {t('editor.undo')}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRedo}
            disabled={!canRedo}
            title={t('editor.redo')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M21 7v6h-6" />
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
            </svg>
            {t('editor.redo')}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={!hasSelection}
            title={t('editor.delete')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            {t('editor.delete')}
          </button>
        </div>
      </div>

      {/* Save */}
      <div className="panel-section">
        <button
          type="button"
          className="btn btn-primary save-button"
          onClick={handleSave}
          disabled={!hasChanges}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          {t('editor.save')}
        </button>
      </div>

      {/* Selection Info */}
      {hasSelection && (
        <div className="panel-section">
          <div className="selection-info">
            {t('editor.selectedCount', { count: selectedAnnotationIds.length })}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="control-panel">
      {/* Mode Selector - Always visible when data is loaded */}
      {cocoData && (
        <div className="panel-section mode-section">
          <ModeSelector className="control-panel-mode-selector" />
        </div>
      )}

      {/* Annotation Mode Controls */}
      {mode === 'annotation' && cocoData && renderAnnotationControls()}

      {/* Viewer Mode Controls */}
      {mode === 'viewer' && (
        <>
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

              {/* Comparison Section */}
              <div className="panel-section">
                <div className="section-header">
                  <h4>{t('controls.comparison')}</h4>
                </div>
                {!isComparing ? (
                  <button
                    className="btn btn-secondary comparison-button"
                    onClick={onOpenComparisonDialog}
                  >
                    <span className="icon">📊</span>
                    {t('controls.openComparisonFile')}
                  </button>
                ) : (
                  <div className="comparison-controls">
                    <div className="comparison-status">{t('controls.comparingFiles')}</div>

                    {/* Comparison info */}
                    <div className="comparison-info">
                      <small>{t('controls.comparisonFilterInfo')}</small>
                    </div>

                    {/* Comparison Result Filters */}
                    <div className="comparison-filters">
                      <label className="category-item">
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={diffFilters.has('tp-gt')}
                          onChange={() => toggleDiffFilter('tp-gt')}
                        />
                        <div
                          className="category-color"
                          style={{
                            backgroundColor: comparisonSettings?.colorSettings.gtColors.tp || '#4CAF50',
                          }}
                        />
                        <span className="category-name">{t('controls.truePositiveGt')}</span>
                      </label>

                      <label className="category-item">
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={diffFilters.has('tp-pred')}
                          onChange={() => toggleDiffFilter('tp-pred')}
                        />
                        <div
                          className="category-color"
                          style={{
                            backgroundColor:
                              comparisonSettings?.colorSettings.predColors.tp || '#66bb6a',
                          }}
                        />
                        <span className="category-name">{t('controls.truePositivePred')}</span>
                      </label>

                      <label className="category-item">
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={diffFilters.has('fn')}
                          onChange={() => toggleDiffFilter('fn')}
                        />
                        <div
                          className="category-color"
                          style={{
                            backgroundColor: comparisonSettings?.colorSettings.gtColors.fn || '#FF9800',
                          }}
                        />
                        <span className="category-name">{t('controls.falseNegative')}</span>
                      </label>

                      <label className="category-item">
                        <input
                          type="checkbox"
                          className="checkbox"
                          checked={diffFilters.has('fp')}
                          onChange={() => toggleDiffFilter('fp')}
                        />
                        <div
                          className="category-color"
                          style={{
                            backgroundColor:
                              comparisonSettings?.colorSettings.predColors.fp || '#F44336',
                          }}
                        />
                        <span className="category-name">{t('controls.falsePositive')}</span>
                      </label>
                    </div>

                    <button className="btn btn-primary" onClick={onOpenComparisonDialog}>
                      {t('controls.changeComparisonSettings')}
                    </button>

                    <button className="btn btn-secondary" onClick={clearComparison}>
                      {t('controls.endComparison')}
                    </button>
                  </div>
                )}
              </div>

              {/* Hide category section during comparison mode */}
              {!isComparing && (
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
                            <div
                              className="category-color"
                              style={{ backgroundColor: categoryColor }}
                            />
                            <span className="category-name">{category.name}</span>
                            <span className="category-count badge">{count}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}

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
