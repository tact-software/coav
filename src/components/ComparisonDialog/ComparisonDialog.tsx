import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useAnnotationStore } from '../../stores/useAnnotationStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { toast } from '../../stores/useToastStore';
import type { COCOData } from '../../types/coco';
import type { ComparisonSettings, DiffDisplaySettings } from '../../types/diff';
import './ComparisonDialog.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ComparisonDialog = ({ isOpen, onClose }: Props) => {
  const { t } = useTranslation();
  const {
    cocoData,
    setComparisonData: setStoreComparisonData,
    currentImageId,
    isComparing,
    comparisonData: currentComparisonData,
    comparisonSettings: currentComparisonSettings,
  } = useAnnotationStore();
  const { colors: colorSettings } = useSettingsStore();

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [comparisonData, setComparisonData] = useState<COCOData | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [roleSelection, setRoleSelection] = useState<'current_gt' | 'current_pred'>('current_gt');
  const [iouThreshold, setIouThreshold] = useState(0.5);
  const [categoryMapping, setCategoryMapping] = useState<Map<number, number[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [maxMatchesPerAnnotation, setMaxMatchesPerAnnotation] = useState(1);
  const [iouMethod, setIouMethod] = useState<'bbox' | 'polygon'>('bbox');

  // Category selection dialog state
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [currentGtCategoryId, setCurrentGtCategoryId] = useState<number | null>(null);

  // Display settings
  const [displaySettings, setDisplaySettings] = useState<DiffDisplaySettings>({
    showBoundingBoxes: true,
    showLabels: true,
  });

  useEffect(() => {
    if (isOpen) {
      if (isComparing && currentComparisonData && currentComparisonSettings) {
        // In comparison mode: load current settings
        console.log('Loading existing comparison settings:', {
          categoryMapping: currentComparisonSettings.categoryMapping,
          iouThreshold: currentComparisonSettings.iouThreshold,
          roleSelection:
            currentComparisonSettings.gtFileId === 'primary' ? 'current_gt' : 'current_pred',
        });

        setComparisonData(currentComparisonData);
        setSelectedImageId(currentImageId);
        setRoleSelection(
          currentComparisonSettings.gtFileId === 'primary' ? 'current_gt' : 'current_pred'
        );
        setIouThreshold(currentComparisonSettings.iouThreshold);
        setCategoryMapping(new Map(currentComparisonSettings.categoryMapping));
        setDisplaySettings({ ...currentComparisonSettings.displaySettings });
        setMaxMatchesPerAnnotation(currentComparisonSettings.maxMatchesPerAnnotation || 1);
        setIouMethod(currentComparisonSettings.iouMethod || 'bbox');
        setSelectedFile('(Current comparison file)'); // Placeholder for current file
      } else {
        // Not in comparison mode: clear everything
        setSelectedFile(null);
        setComparisonData(null);
        setSelectedImageId(null);
        setCategoryMapping(new Map());
        setRoleSelection('current_gt');
        setIouThreshold(0.5);
        setDisplaySettings({
          showBoundingBoxes: true,
          showLabels: true,
        });
        setMaxMatchesPerAnnotation(1);
        setIouMethod('bbox');
      }
    }
  }, [isOpen, isComparing, currentComparisonData, currentComparisonSettings, currentImageId]);

  useEffect(() => {
    if (isOpen && cocoData && comparisonData) {
      console.debug('ComparisonDialog useEffect - data available:', {
        cocoCategories: cocoData.categories.length,
        comparisonCategories: comparisonData.categories.length,
        comparisonImages: comparisonData.images.length,
        comparisonAnnotations: comparisonData.annotations.length,
        hasExistingMapping: categoryMapping.size > 0,
      });

      // Only initialize category mapping if there's no existing mapping or we're not restoring from existing settings
      if (categoryMapping.size === 0 && (!isComparing || !currentComparisonSettings)) {
        console.debug('No existing mapping found, creating auto-mapping');
        const mapping = new Map<number, number[]>();
        cocoData.categories.forEach((cat) => {
          // Try to find matching category by name
          const match = comparisonData.categories.find(
            (compCat) => compCat.name.toLowerCase() === cat.name.toLowerCase()
          );
          if (match) {
            mapping.set(cat.id, [match.id]);
          }
          // 割り当てなしの場合はマッピングを作成しない
        });
        setCategoryMapping(mapping);
      } else {
        console.debug('Existing mapping found or restoring from settings, preserving it');
      }
    }
  }, [isOpen, cocoData, comparisonData, categoryMapping, isComparing, currentComparisonSettings]);

  // Debug: Monitor selectedImageId changes
  useEffect(() => {
    console.debug('selectedImageId changed:', {
      selectedImageId,
      type: typeof selectedImageId,
      hasComparisonData: !!comparisonData,
    });
  }, [selectedImageId]);

  const handleFileSelect = async () => {
    try {
      const selected = await open({
        filters: [
          {
            name: 'COCO JSON',
            extensions: ['json'],
          },
        ],
      });

      if (selected) {
        setIsLoading(true);
        const data = await invoke<COCOData>('load_annotations', {
          filePath: selected,
        });

        console.debug('Loaded comparison file data:', {
          filePath: selected,
          images: data.images?.length || 0,
          annotations: data.annotations?.length || 0,
          categories: data.categories?.length || 0,
          firstImage: data.images?.[0],
          sampleAnnotations: data.annotations?.slice(0, 3),
        });

        setSelectedFile(selected);
        setComparisonData(data);

        console.debug('State after setComparisonData:', {
          dataSet: !!data,
          imagesCount: data.images?.length || 0,
        });

        // Auto-select first image or keep null for dropdown selection
        if (data.images && data.images.length === 1) {
          // Only one image, auto-select it
          setSelectedImageId(data.images[0].id);
        } else {
          // Multiple images, user will select from dropdown
          setSelectedImageId(null);
        }

        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading comparison file:', error);
      const errorMessage = error instanceof Error ? error.message : t('comparison.fileLoadError');
      toast.error(t('comparison.fileLoadError'), errorMessage);
      setIsLoading(false);
    }
  };

  const handleCompare = () => {
    console.debug('handleCompare called with current state:', {
      hasCocoData: !!cocoData,
      hasComparisonData: !!comparisonData,
      comparisonDataImages: comparisonData?.images?.length,
      comparisonDataAnnotations: comparisonData?.annotations?.length,
      selectedImageId,
      selectedFile,
    });

    if (!cocoData || !comparisonData || !selectedImageId) {
      console.error('Missing required data for comparison:', {
        hasCocoData: !!cocoData,
        hasComparisonData: !!comparisonData,
        selectedImageId,
      });
      return;
    }

    console.debug('Starting comparison:', {
      selectedImageId,
      comparisonImages: comparisonData.images.length,
      comparisonAnnotations: comparisonData.annotations.length,
    });

    // Filter comparison data to only include annotations for the selected image
    console.debug('Before filtering:', {
      selectedImageId,
      selectedImageIdType: typeof selectedImageId,
      allAnnotations: comparisonData.annotations.length,
      annotationImageIds: [...new Set(comparisonData.annotations.map((a) => a.image_id))],
      annotationImageIdTypes: [
        ...new Set(comparisonData.annotations.map((a) => typeof a.image_id)),
      ],
      matchingAnnotationsStrict: comparisonData.annotations.filter(
        (ann) => ann.image_id === selectedImageId
      ).length,
      matchingAnnotationsLoose: comparisonData.annotations.filter(
        (ann) => ann.image_id == selectedImageId
      ).length,
    });

    const filteredComparisonData: COCOData = {
      ...comparisonData,
      annotations: comparisonData.annotations.filter((ann) => ann.image_id === selectedImageId),
      images: comparisonData.images.filter((img) => img.id === selectedImageId),
    };

    console.debug('After filtering:', {
      filteredAnnotations: filteredComparisonData.annotations.length,
      filteredImages: filteredComparisonData.images.length,
      firstFilteredAnnotation: filteredComparisonData.annotations[0],
    });

    const settings: ComparisonSettings = {
      gtFileId: roleSelection === 'current_gt' ? 'primary' : 'comparison',
      predFileId: roleSelection === 'current_gt' ? 'comparison' : 'primary',
      iouThreshold,
      categoryMapping:
        roleSelection === 'current_gt' ? categoryMapping : invertMapping(categoryMapping),
      colorSettings: colorSettings.comparison || {
        gtColors: { tp: '#4caf50', fn: '#ff9800' },
        predColors: { tp: '#66bb6a', fp: '#f44336' },
      },
      displaySettings,
      maxMatchesPerAnnotation: maxMatchesPerAnnotation > 1 ? maxMatchesPerAnnotation : undefined,
      iouMethod,
    };

    // Always use the loaded comparison file data, not current data
    // The role selection determines which is GT and which is Pred in settings
    setStoreComparisonData(filteredComparisonData, settings);
    onClose();
  };

  const invertMapping = (mapping: Map<number, number[]>): Map<number, number[]> => {
    const inverted = new Map<number, number[]>();
    mapping.forEach((values, key) => {
      values.forEach((value) => {
        const existing = inverted.get(value) || [];
        inverted.set(value, [...existing, key]);
      });
    });
    return inverted;
  };

  const updateCategoryMapping = (gtCatId: number, predCatId: number, isAdd: boolean = true) => {
    const newMapping = new Map(categoryMapping);
    const currentMappings = newMapping.get(gtCatId) || [];

    if (isAdd) {
      // 追加：重複チェックして追加
      if (!currentMappings.includes(predCatId)) {
        newMapping.set(gtCatId, [...currentMappings, predCatId]);
      }
    } else {
      // 削除：指定されたマッピングを削除
      const filteredMappings = currentMappings.filter((id) => id !== predCatId);
      if (filteredMappings.length > 0) {
        newMapping.set(gtCatId, filteredMappings);
      } else {
        newMapping.delete(gtCatId);
      }
    }

    setCategoryMapping(newMapping);
  };

  // 指定されたカテゴリIDが他のマッピングで使用されているかチェック
  const isPredCategoryUsed = (predCatId: number, excludeGtCatId?: number): boolean => {
    for (const [gtId, predIds] of categoryMapping) {
      if (excludeGtCatId && gtId === excludeGtCatId) continue;
      if (predIds.includes(predCatId)) return true;
    }
    return false;
  };

  // カテゴリ選択ダイアログを開く
  const openCategoryDialog = (gtCategoryId: number) => {
    setCurrentGtCategoryId(gtCategoryId);
    setShowCategoryDialog(true);
  };

  // カテゴリ選択ダイアログでカテゴリを選択
  const handleCategorySelect = (predCategoryId: number) => {
    if (currentGtCategoryId !== null && !isPredCategoryUsed(predCategoryId)) {
      updateCategoryMapping(currentGtCategoryId, predCategoryId, true);
    }
    setShowCategoryDialog(false);
    setCurrentGtCategoryId(null);
  };

  // ダイアログが閉じられる際の処理
  const handleClose = () => {
    // カテゴリ選択ダイアログも閉じる
    setShowCategoryDialog(false);
    setCurrentGtCategoryId(null);
    onClose();
  };

  // 未割当のカテゴリを取得
  const getAvailableCategories = () => {
    if (!comparisonData) return [];
    return comparisonData.categories.filter((cat) => !isPredCategoryUsed(cat.id));
  };

  if (!isOpen) return null;

  return (
    <div className="comparison-dialog-overlay" onClick={handleClose}>
      <div className="comparison-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="comparison-dialog-header">
          <h2>{t('comparison.title')}</h2>
          <button className="close-button" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="comparison-dialog-content">
          {/* Current File Info */}
          <div className="comparison-section">
            <h3>{t('comparison.currentFileInfo')}</h3>
            <div className="file-info">
              {cocoData && (
                <>
                  <div>
                    {t('comparison.fileInfo', {
                      images: cocoData.images.length,
                      annotations: cocoData.annotations.length,
                    })}
                  </div>
                  {currentImageId && (
                    <div className="selected-image-info">
                      {t('comparison.currentImage')}:{' '}
                      {cocoData.images.find((img) => img.id === currentImageId)?.file_name ||
                        'Unknown'}{' '}
                      (ID: {currentImageId})
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* File Selection */}
          <div className="comparison-section">
            <h3>{t('comparison.fileSelection')}</h3>
            <div className="file-selection">
              <button
                className="file-select-button"
                onClick={handleFileSelect}
                disabled={isLoading || isComparing}
              >
                {isComparing
                  ? t('comparison.usingCurrentFile')
                  : selectedFile
                    ? selectedFile.split('/').pop()
                    : t('comparison.selectFile')}
              </button>
              {comparisonData && (
                <div className="file-info">
                  {t('comparison.fileInfo', {
                    images: comparisonData.images.length,
                    annotations: comparisonData.annotations.length,
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Image Selection (for multiple images) */}
          {comparisonData && comparisonData.images.length > 1 && (
            <div className="comparison-section">
              <h3>{t('comparison.imageSelection')}</h3>
              <div className="image-selection">
                <select
                  value={selectedImageId || ''}
                  onChange={(e) =>
                    setSelectedImageId(e.target.value ? parseInt(e.target.value) : null)
                  }
                  className="image-select-dropdown"
                >
                  <option value="">{t('comparison.selectImage')}</option>
                  {comparisonData.images.map((img) => (
                    <option key={img.id} value={img.id}>
                      {img.file_name} (ID: {img.id})
                    </option>
                  ))}
                </select>
                {selectedImageId && (
                  <div className="selected-image-info">
                    {t('comparison.selectedImageAnnotations')}:{' '}
                    {
                      comparisonData.annotations.filter((ann) => ann.image_id === selectedImageId)
                        .length
                    }
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Role Selection */}
          <div className="comparison-section">
            <h3>{t('comparison.roleSelection')}</h3>
            <div className="role-selection">
              <label>
                <input
                  type="radio"
                  name="role"
                  value="current_gt"
                  checked={roleSelection === 'current_gt'}
                  onChange={() => setRoleSelection('current_gt')}
                />
                {t('comparison.currentAsGT')}
              </label>
              <label>
                <input
                  type="radio"
                  name="role"
                  value="current_pred"
                  checked={roleSelection === 'current_pred'}
                  onChange={() => setRoleSelection('current_pred')}
                />
                {t('comparison.currentAsPred')}
              </label>
            </div>
          </div>

          {/* Category Mapping */}
          {cocoData && comparisonData && (
            <div className="comparison-section">
              <h3>{t('comparison.categoryMapping')}</h3>
              <div className="category-mapping-description">
                {t('comparison.categoryMappingDescription')}
              </div>
              <div className="category-mapping">
                <div className="mapping-header">
                  <div>{t('comparison.currentFile')}</div>
                  <div>{t('comparison.comparisonFile')}</div>
                </div>

                {/* 割り当て済みカテゴリ */}
                {cocoData.categories.map((cat) => {
                  const mappedCategories = categoryMapping.get(cat.id) || [];
                  if (mappedCategories.length === 0) return null;

                  return (
                    <div key={cat.id} className="mapping-row">
                      <div className="category-name">
                        {cat.name} ({cat.id})
                      </div>
                      <div className="category-badge-list">
                        {/* マッピングされたカテゴリのバッジ */}
                        {mappedCategories.map((predCatId) => {
                          const predCat = comparisonData.categories.find((c) => c.id === predCatId);
                          return (
                            <div key={predCatId} className="category-badge pred-category">
                              <span className="badge-icon">●</span>
                              <span className="badge-text">{predCat?.name}</span>
                              <button
                                type="button"
                                className="badge-remove"
                                onClick={() => updateCategoryMapping(cat.id, predCatId, false)}
                                title={t('comparison.removeMapping')}
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}

                        {/* Addバッジ */}
                        {getAvailableCategories().length > 0 && (
                          <button
                            type="button"
                            className="category-badge add-badge"
                            onClick={() => openCategoryDialog(cat.id)}
                            title={t('comparison.addMapping')}
                          >
                            <span className="badge-icon">+</span>
                            <span className="badge-text">{t('comparison.add')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* 未割当カテゴリの行追加 */}
                {cocoData.categories
                  .filter(
                    (cat) =>
                      !categoryMapping.has(cat.id) || categoryMapping.get(cat.id)?.length === 0
                  )
                  .map((cat) => (
                    <div key={cat.id} className="mapping-row">
                      <div className="category-name">
                        {cat.name} ({cat.id})
                      </div>
                      <div className="category-badge-list">
                        {/* 追加ボタンのみ */}
                        {getAvailableCategories().length > 0 && (
                          <button
                            type="button"
                            className="category-badge add-badge"
                            onClick={() => openCategoryDialog(cat.id)}
                            title={t('comparison.addMapping')}
                          >
                            <span className="badge-icon">+</span>
                            <span className="badge-text">{t('comparison.add')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                {/* 比較ファイルの未割当カテゴリ */}
                {getAvailableCategories().length > 0 && (
                  <div className="mapping-row unassigned-comparison-row">
                    <div className="category-name unassigned-label">
                      {t('comparison.unassignedComparison')}
                    </div>
                    <div className="category-badge-list">
                      {getAvailableCategories().map((cat) => (
                        <div key={cat.id} className="category-badge unassigned-comparison-category">
                          <span className="badge-icon">○</span>
                          <span className="badge-text">{cat.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* IoU Threshold */}
          <div className="comparison-section">
            <h3>{t('comparison.matchingSettings')}</h3>
            <div className="iou-threshold">
              <label>
                {t('comparison.iouThreshold')}: {iouThreshold.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.05"
                max="0.95"
                step="0.05"
                value={iouThreshold}
                onChange={(e) => setIouThreshold(parseFloat(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="maxMatches">{t('comparison.maxMatchesPerAnnotation')}</label>
              <input
                id="maxMatches"
                type="number"
                className="input"
                min="1"
                value={maxMatchesPerAnnotation}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 1) {
                    setMaxMatchesPerAnnotation(value);
                  }
                }}
              />
            </div>
            <div className="iou-method">
              <label>{t('comparison.iouMethod')}</label>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    value="bbox"
                    checked={iouMethod === 'bbox'}
                    onChange={(e) => setIouMethod(e.target.value as 'bbox' | 'polygon')}
                  />
                  {t('comparison.bboxIoU')}
                </label>
                <label>
                  <input
                    type="radio"
                    value="polygon"
                    checked={iouMethod === 'polygon'}
                    onChange={(e) => setIouMethod(e.target.value as 'bbox' | 'polygon')}
                  />
                  {t('comparison.polygonIoU')}
                </label>
              </div>
              <div className="setting-description">{t('comparison.iouMethodDescription')}</div>
              {iouMethod === 'polygon' && (
                <div className="polygon-iou-warning">
                  <i className="warning-icon">⚠️</i>
                  {t('comparison.polygonIoUWarning')}
                </div>
              )}
            </div>
          </div>

          {/* Display Settings */}
          <div className="comparison-section">
            <h3>{t('comparison.displaySettings')}</h3>
            <div className="display-settings">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={displaySettings.showBoundingBoxes}
                  onChange={(e) =>
                    setDisplaySettings({
                      ...displaySettings,
                      showBoundingBoxes: e.target.checked,
                    })
                  }
                />
                {t('comparison.showBoundingBoxes')}
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={displaySettings.showLabels}
                  onChange={(e) =>
                    setDisplaySettings({
                      ...displaySettings,
                      showLabels: e.target.checked,
                    })
                  }
                />
                {t('comparison.showLabels')}
              </label>
            </div>
          </div>
        </div>

        <div className="comparison-dialog-footer">
          <button className="cancel-button" onClick={handleClose}>
            {t('common.cancel')}
          </button>
          <button
            className="compare-button"
            onClick={handleCompare}
            disabled={!comparisonData || !selectedImageId || isLoading}
            title={
              !comparisonData
                ? 'No comparison file loaded'
                : !selectedImageId
                  ? 'No image selected'
                  : ''
            }
          >
            {t('comparison.startComparison')}
          </button>
        </div>
      </div>

      {/* カテゴリ選択ダイアログ */}
      {showCategoryDialog && (
        <div
          className="category-dialog-overlay"
          onClick={() => {
            setShowCategoryDialog(false);
            setCurrentGtCategoryId(null);
          }}
        >
          <div className="category-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="category-dialog-header">
              <h3>{t('comparison.selectCategory')}</h3>
              <button
                className="close-button"
                onClick={() => {
                  setShowCategoryDialog(false);
                  setCurrentGtCategoryId(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="category-dialog-content">
              <div className="available-categories">
                {getAvailableCategories().map((cat) => (
                  <button
                    key={cat.id}
                    className="category-option"
                    onClick={() => handleCategorySelect(cat.id)}
                  >
                    <span className="category-option-icon">○</span>
                    <span className="category-option-text">
                      {cat.name} ({cat.id})
                    </span>
                  </button>
                ))}
              </div>
              {getAvailableCategories().length === 0 && (
                <div className="no-categories">{t('comparison.noAvailableCategories')}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
