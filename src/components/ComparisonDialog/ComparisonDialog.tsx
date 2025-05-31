import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useAnnotationStore } from '../../stores/useAnnotationStore';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { toast } from '../../stores/useToastStore';
import { useLoadingStore } from '../../stores/useLoadingStore';
import { CommonModal } from '../CommonModal';
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
    originalComparisonData,
    comparisonSettings: currentComparisonSettings,
  } = useAnnotationStore();
  const { navigationMode } = useNavigationStore();
  const { colors: colorSettings } = useSettingsStore();
  const { setLoading } = useLoadingStore();

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [comparisonData, setComparisonData] = useState<COCOData | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [roleSelection, setRoleSelection] = useState<'current_gt' | 'current_pred'>('current_gt');
  const [iouThreshold, setIouThreshold] = useState(0.5);
  const [categoryMapping, setCategoryMapping] = useState<Map<number, number[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [maxMatchesPerAnnotation, setMaxMatchesPerAnnotation] = useState(1);
  const [iouMethod, setIouMethod] = useState<'bbox' | 'polygon'>('bbox');
  const [hasManualMapping, setHasManualMapping] = useState(false);

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

        // Use original comparison data if available, otherwise use current (for backward compatibility)
        setComparisonData(originalComparisonData || currentComparisonData);
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
        setHasManualMapping(false);
      }
    }
  }, [isOpen, isComparing, currentComparisonData, currentComparisonSettings, currentImageId]);

  useEffect(() => {
    if (isOpen && cocoData && comparisonData) {
      // Only initialize category mapping if we're not restoring from existing settings and no manual mapping exists
      if ((!isComparing || !currentComparisonSettings) && !hasManualMapping) {
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
      }
    }
  }, [isOpen, cocoData, comparisonData, isComparing, currentComparisonSettings]);

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

        setSelectedFile(selected);
        setComparisonData(data);

        // Handle image selection based on navigation mode
        if (data.images && data.images.length === 1) {
          // Only one image, auto-select it
          setSelectedImageId(data.images[0].id);
        } else if (navigationMode === 'folder' && currentImageId) {
          // Folder mode: automatically find corresponding image ID
          const correspondingImage = data.images.find(img => img.id === currentImageId);
          if (correspondingImage) {
            setSelectedImageId(correspondingImage.id);
          } else {
            // No corresponding image found, show error
            toast.error(
              t('comparison.imageNotFound'),
              t('comparison.noCorrespondingImage', { imageId: currentImageId })
            );
            setSelectedImageId(null);
          }
        } else {
          // Single image mode with multiple images: user will select from dropdown
          setSelectedImageId(null);
        }

        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading comparison file:', error);
      const errorMessage = error instanceof Error ? error.message : t('comparison.fileLoadError');
      toast.error(t('comparison.fileLoadError'), errorMessage);
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!cocoData || !comparisonData || !selectedImageId) {
      return;
    }

    setLoading(true, t('comparison.processing'), t('comparison.processingSubMessage'));

    console.debug('Starting comparison:', {
      selectedImageId,
      currentImageId,
      isComparing,
      comparisonImages: comparisonData.images.length,
      comparisonAnnotations: comparisonData.annotations.length,
    });

    // When changing settings in comparison mode, we should use the full comparison data
    // Only filter for initial comparison setup
    const shouldFilterData = !isComparing;
    
    const targetImageId = currentImageId || selectedImageId;

    const filteredComparisonData: COCOData = shouldFilterData ? {
      ...comparisonData,
      // Map annotations to use the target image ID for comparison
      annotations: comparisonData.annotations
        .filter((ann) => ann.image_id === selectedImageId)
        .map((ann) => ({
          ...ann,
          image_id: targetImageId, // Use the current image ID for comparison
        })),
      images: comparisonData.images
        .filter((img) => img.id === selectedImageId)
        .map((img) => ({
          ...img,
          id: targetImageId, // Use the current image ID for comparison
        })),
    } : {
      // In comparison mode, just update the current image's annotations
      ...comparisonData,
      annotations: comparisonData.annotations
        .filter((ann) => ann.image_id === currentImageId!)
        .map((ann) => ({
          ...ann,
          image_id: currentImageId!,
        })),
      images: comparisonData.images
        .filter((img) => img.id === currentImageId!)
        .map((img) => ({
          ...img,
          id: currentImageId!,
        })),
    };

    console.debug('After filtering and ID mapping:', {
      originalImageId: selectedImageId,
      targetImageId,
      currentImageId,
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

    // Use setTimeout to ensure the loading overlay appears before heavy computation
    setTimeout(() => {
      setStoreComparisonData(comparisonData, filteredComparisonData, settings);
      setLoading(false);
      onClose();
    }, 100);
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
    console.debug('updateCategoryMapping called:', {
      gtCatId,
      predCatId,
      isAdd,
      currentMappingSize: categoryMapping.size,
      currentMappings: Array.from(categoryMapping.entries()),
    });

    const newMapping = new Map(categoryMapping);
    const currentMappings = newMapping.get(gtCatId) || [];

    if (isAdd) {
      // 追加：重複チェックして追加
      if (!currentMappings.includes(predCatId)) {
        const newMappings = [...currentMappings, predCatId];
        newMapping.set(gtCatId, newMappings);
        console.debug('Added mapping successfully:', {
          gtCatId,
          predCatId,
          oldMappings: currentMappings,
          newMappings,
        });
      } else {
        console.warn('Mapping already exists:', { gtCatId, predCatId, currentMappings });
      }
    } else {
      // 削除：指定されたマッピングを削除
      const filteredMappings = currentMappings.filter((id) => id !== predCatId);
      if (filteredMappings.length > 0) {
        newMapping.set(gtCatId, filteredMappings);
      } else {
        newMapping.delete(gtCatId);
      }
      console.debug('Removed mapping:', {
        gtCatId,
        predCatId,
        oldMappings: currentMappings,
        newMappings: filteredMappings,
      });
    }

    console.debug('Setting new category mapping:', {
      oldSize: categoryMapping.size,
      newSize: newMapping.size,
      newMappings: Array.from(newMapping.entries()),
    });
    setCategoryMapping(newMapping);
    setHasManualMapping(true); // Mark that manual mapping has been set
  };

  // カテゴリ選択ダイアログを開く
  const openCategoryDialog = (gtCategoryId: number) => {
    setCurrentGtCategoryId(gtCategoryId);
    setShowCategoryDialog(true);
  };

  // カテゴリ選択ダイアログでカテゴリを選択
  const handleCategorySelect = (predCategoryId: number) => {
    console.debug('handleCategorySelect called:', {
      currentGtCategoryId,
      predCategoryId,
      currentMappingState: Array.from(categoryMapping.entries()),
    });

    if (currentGtCategoryId !== null) {
      console.debug('Calling updateCategoryMapping with:', {
        gtCategoryId: currentGtCategoryId,
        predCategoryId,
        isAdd: true,
      });
      updateCategoryMapping(currentGtCategoryId, predCategoryId, true);
      console.debug('After updateCategoryMapping, new state:', {
        newMappingState: Array.from(categoryMapping.entries()),
      });
    } else {
      console.warn('currentGtCategoryId is null, cannot add mapping');
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

  // 表示用：使用済みでないカテゴリのみを取得
  const getUnusedCategories = () => {
    if (!comparisonData) return [];
    const usedCategoryIds = new Set<number>();

    // 現在のマッピングで使用されているカテゴリIDを収集
    categoryMapping.forEach((predIds) => {
      predIds.forEach((id) => usedCategoryIds.add(id));
    });

    // 使用されていないカテゴリのみを返す
    return comparisonData.categories.filter((cat) => !usedCategoryIds.has(cat.id));
  };

  return (
    <>
      <CommonModal
        isOpen={isOpen}
        onClose={handleClose}
        title={t('comparison.title')}
        size="xl"
        hasBlur={true}
        footer={
          <>
            <button className="btn btn-secondary" onClick={handleClose}>
              {t('common.cancel')}
            </button>
            <button
              className="btn btn-primary"
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
          </>
        }
      >
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

        {/* Image Selection (for multiple images in single mode only) */}
        {comparisonData && comparisonData.images.length > 1 && navigationMode === 'single' && (
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

        {/* Show selected image info for folder mode */}
        {comparisonData && navigationMode === 'folder' && selectedImageId && (
          <div className="comparison-section">
            <h3>{t('comparison.selectedImage')}</h3>
            <div className="selected-image-info">
              {comparisonData.images.find(img => img.id === selectedImageId)?.file_name} (ID: {selectedImageId})
              <br />
              {t('comparison.selectedImageAnnotations')}:{' '}
              {comparisonData.annotations.filter((ann) => ann.image_id === selectedImageId).length}
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
                      {getUnusedCategories().length > 0 && (
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
                  (cat) => !categoryMapping.has(cat.id) || categoryMapping.get(cat.id)?.length === 0
                )
                .map((cat) => (
                  <div key={cat.id} className="mapping-row">
                    <div className="category-name">
                      {cat.name} ({cat.id})
                    </div>
                    <div className="category-badge-list">
                      {/* 追加ボタンのみ */}
                      {getUnusedCategories().length > 0 && (
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

              {/* 比較ファイルの未使用カテゴリ */}
              {getUnusedCategories().length > 0 && (
                <div className="mapping-row unassigned-comparison-row">
                  <div className="category-name unassigned-label">
                    {t('comparison.availableCategories')}
                  </div>
                  <div className="category-badge-list">
                    {getUnusedCategories().map((cat) => (
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
      </CommonModal>

      {/* カテゴリ選択ダイアログ */}
      <CommonModal
        isOpen={showCategoryDialog}
        onClose={() => {
          setShowCategoryDialog(false);
          setCurrentGtCategoryId(null);
        }}
        title={t('comparison.selectCategory')}
        size="md"
        hasBlur={true}
      >
        <div className="available-categories">
          {getUnusedCategories().map((cat) => (
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
        {getUnusedCategories().length === 0 && (
          <div className="no-categories">{t('comparison.noAvailableCategories')}</div>
        )}
      </CommonModal>
    </>
  );
};
