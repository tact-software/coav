import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { useAnnotationStore } from '../../stores/useAnnotationStore';
import { toast } from '../../stores/useToastStore';
import type { COCOData } from '../../types/coco';
import type { ComparisonSettings, DiffColorSettings, DiffDisplaySettings } from '../../types/diff';
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

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [comparisonData, setComparisonData] = useState<COCOData | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [roleSelection, setRoleSelection] = useState<'current_gt' | 'current_pred'>('current_gt');
  const [iouThreshold, setIouThreshold] = useState(0.5);
  const [categoryMapping, setCategoryMapping] = useState<Map<number, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [maxMatchesPerAnnotation, setMaxMatchesPerAnnotation] = useState(1);
  const [iouMethod, setIouMethod] = useState<'bbox' | 'polygon'>('bbox');

  // Color settings
  const [colorSettings, setColorSettings] = useState<DiffColorSettings>({
    gtColors: {
      tp: '#4caf50', // Green
      fn: '#ff9800', // Orange
    },
    predColors: {
      tp: '#66bb6a', // Light Green (different from GT)
      fp: '#f44336', // Red
    },
  });

  // Display settings
  const [displaySettings, setDisplaySettings] = useState<DiffDisplaySettings>({
    showBoundingBoxes: true,
    showLabels: true,
  });

  // Initialize state when dialog opens for the first time
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (isOpen && !hasInitialized) {
      setHasInitialized(true);

      if (isComparing && currentComparisonData && currentComparisonSettings) {
        // In comparison mode: load current settings
        setComparisonData(currentComparisonData);
        setSelectedImageId(currentImageId);
        setRoleSelection(
          currentComparisonSettings.gtFileId === 'primary' ? 'current_gt' : 'current_pred'
        );
        setIouThreshold(currentComparisonSettings.iouThreshold);
        setCategoryMapping(currentComparisonSettings.categoryMapping);
        setColorSettings(currentComparisonSettings.colorSettings);
        setDisplaySettings(currentComparisonSettings.displaySettings);
        setMaxMatchesPerAnnotation(currentComparisonSettings.maxMatchesPerAnnotation || 1);
        setIouMethod(currentComparisonSettings.iouMethod || 'bbox');
        setSelectedFile('(Current comparison file)'); // Placeholder for current file
      } else {
        // Not in comparison mode: clear everything
        setSelectedFile(null);
        setComparisonData(null);
        setSelectedImageId(null);
        setCategoryMapping(new Map());
      }
    }

    // Reset initialization flag when dialog closes
    if (!isOpen) {
      setHasInitialized(false);
    }
  }, [
    isOpen,
    hasInitialized,
    isComparing,
    currentComparisonData,
    currentComparisonSettings,
    currentImageId,
  ]);

  useEffect(() => {
    if (isOpen && cocoData && comparisonData) {
      console.debug('ComparisonDialog useEffect - data available:', {
        cocoCategories: cocoData.categories.length,
        comparisonCategories: comparisonData.categories.length,
        comparisonImages: comparisonData.images.length,
        comparisonAnnotations: comparisonData.annotations.length,
      });

      // Initialize category mapping
      const mapping = new Map<number, number>();
      cocoData.categories.forEach((cat) => {
        // Try to find matching category by name
        const match = comparisonData.categories.find(
          (compCat) => compCat.name.toLowerCase() === cat.name.toLowerCase()
        );
        mapping.set(cat.id, match ? match.id : cat.id);
      });
      setCategoryMapping(mapping);
    }
  }, [isOpen, cocoData, comparisonData]);

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
      colorSettings,
      displaySettings,
      maxMatchesPerAnnotation: maxMatchesPerAnnotation > 1 ? maxMatchesPerAnnotation : undefined,
      iouMethod,
    };

    // Always use the loaded comparison file data, not current data
    // The role selection determines which is GT and which is Pred in settings
    setStoreComparisonData(filteredComparisonData, settings);
    onClose();
  };

  const invertMapping = (mapping: Map<number, number>): Map<number, number> => {
    const inverted = new Map<number, number>();
    mapping.forEach((value, key) => {
      inverted.set(value, key);
    });
    return inverted;
  };

  const updateCategoryMapping = (gtCatId: number, predCatId: number) => {
    const newMapping = new Map(categoryMapping);
    newMapping.set(gtCatId, predCatId);
    setCategoryMapping(newMapping);
  };

  if (!isOpen) return null;

  return (
    <div className="comparison-dialog-overlay" onClick={onClose}>
      <div className="comparison-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="comparison-dialog-header">
          <h2>{t('comparison.title')}</h2>
          <button className="close-button" onClick={onClose}>
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
              <div className="category-mapping">
                <div className="mapping-header">
                  <div>{t('comparison.currentFile')}</div>
                  <div>{t('comparison.comparisonFile')}</div>
                </div>
                {cocoData.categories.map((cat) => (
                  <div key={cat.id} className="mapping-row">
                    <div className="category-name">
                      {cat.name} ({cat.id})
                    </div>
                    <select
                      value={categoryMapping.get(cat.id) || ''}
                      onChange={(e) => updateCategoryMapping(cat.id, parseInt(e.target.value))}
                    >
                      <option value="">{t('comparison.noMapping')}</option>
                      {comparisonData.categories.map((compCat) => (
                        <option key={compCat.id} value={compCat.id}>
                          {compCat.name} ({compCat.id})
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
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
                min="0.1"
                max="0.9"
                step="0.05"
                value={iouThreshold}
                onChange={(e) => setIouThreshold(parseFloat(e.target.value))}
              />
            </div>
            <div className="max-matches">
              <label>
                {t('comparison.maxMatchesPerAnnotation')}: {maxMatchesPerAnnotation}
              </label>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={maxMatchesPerAnnotation}
                onChange={(e) => setMaxMatchesPerAnnotation(parseInt(e.target.value))}
              />
              <div className="setting-description">{t('comparison.maxMatchesDescription')}</div>
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
            </div>
          </div>

          {/* Color Settings */}
          <div className="comparison-section">
            <h3>{t('comparison.colorSettings')}</h3>
            <div className="color-settings">
              <div className="color-group">
                <h4>{t('comparison.gtColors')}</h4>
                <div className="color-item">
                  <label>{t('comparison.truePositive')}</label>
                  <input
                    type="color"
                    value={colorSettings.gtColors.tp}
                    onChange={(e) =>
                      setColorSettings({
                        ...colorSettings,
                        gtColors: { ...colorSettings.gtColors, tp: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="color-item">
                  <label>{t('comparison.falseNegative')}</label>
                  <input
                    type="color"
                    value={colorSettings.gtColors.fn}
                    onChange={(e) =>
                      setColorSettings({
                        ...colorSettings,
                        gtColors: { ...colorSettings.gtColors, fn: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
              <div className="color-group">
                <h4>{t('comparison.predColors')}</h4>
                <div className="color-item">
                  <label>{t('comparison.truePositive')}</label>
                  <input
                    type="color"
                    value={colorSettings.predColors.tp}
                    onChange={(e) =>
                      setColorSettings({
                        ...colorSettings,
                        predColors: { ...colorSettings.predColors, tp: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="color-item">
                  <label>{t('comparison.falsePositive')}</label>
                  <input
                    type="color"
                    value={colorSettings.predColors.fp}
                    onChange={(e) =>
                      setColorSettings({
                        ...colorSettings,
                        predColors: { ...colorSettings.predColors, fp: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
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
          <button className="cancel-button" onClick={onClose}>
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
    </div>
  );
};
