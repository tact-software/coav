import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnnotationStore, useSettingsStore } from '../../stores';
import { getValueByPath, hasFieldPath } from '../../utils';
import { COCOAnnotation } from '../../types/coco';
import './AnnotationDetailPanel.css';

type ViewMode = 'formatted' | 'json';

const AnnotationDetailPanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    selectedAnnotationIds,
    cocoData,
    getCategoryById,
    isComparing,
    comparisonData,
    diffResults,
    comparisonSettings,
  } = useAnnotationStore();
  const { detail } = useSettingsStore();

  const [viewMode, setViewMode] = useState<ViewMode>('formatted');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Get selected annotations and comparison info
  const { selectedAnnotations, comparisonInfo } = React.useMemo(() => {
    if (!cocoData) return { selectedAnnotations: [], comparisonInfo: null };

    const allAnnotations = [...cocoData.annotations];
    if (isComparing && comparisonData) {
      // Add comparison annotations with source tags
      const comparisonAnnotations = comparisonData.annotations.map((ann) => ({
        ...ann,
        _source: 'comparison' as const,
      }));
      allAnnotations.push(...comparisonAnnotations);
    }

    // Tag primary annotations with source (don't overwrite existing _source)
    const taggedAnnotations = allAnnotations.map((ann) => ({
      ...ann,
      _source: ann._source ? ann._source : ('primary' as const),
    }));

    const selected = taggedAnnotations.filter((ann) => {
      for (const selectedId of selectedAnnotationIds) {
        if (typeof selectedId === 'string') {
          // Handle unique IDs like "primary-123" or "comparison-456"
          const [source, id] = selectedId.split('-');
          if (ann._source === source && ann.id === parseInt(id)) {
            return true;
          }
        } else {
          // Handle direct number IDs (non-comparison mode)
          if (ann.id === selectedId) {
            return true;
          }
        }
      }
      return false;
    });

    // Get comparison info for the first selected annotation
    let comparison = null;
    if (isComparing && selected.length > 0 && diffResults && comparisonSettings) {
      const firstAnnotation = selected[0];

      // Debug: Log selected annotation info
      console.debug('Selected annotation for detail panel:', {
        id: firstAnnotation.id,
        source: firstAnnotation._source,
        category_id: firstAnnotation.category_id,
        bbox: firstAnnotation.bbox,
        selectedIds: selectedAnnotationIds,
      });

      const imageDiff = diffResults.get(firstAnnotation.image_id);

      if (imageDiff) {
        // Find matching pairs for this annotation
        const matches = [];

        // Determine if this is GT or Pred based on source and settings
        const isFromGTDataset =
          (comparisonSettings.gtFileId === 'primary' && firstAnnotation._source === 'primary') ||
          (comparisonSettings.gtFileId === 'comparison' &&
            firstAnnotation._source === 'comparison');

        // Debug: Log comparison data
        console.debug('Searching for matches:', {
          annotationId: firstAnnotation.id,
          source: firstAnnotation._source,
          isFromGTDataset,
          gtFileId: comparisonSettings.gtFileId,
          truePositivesCount: imageDiff.truePositives.length,
          belowThresholdCount: imageDiff.belowThresholdMatches?.length || 0,
          fpCount: imageDiff.falsePositives.length,
          fnCount: imageDiff.falseNegatives.length,
        });

        // Check TP matches - need to match both ID and source
        for (const tp of imageDiff.truePositives) {
          console.debug('Checking TP match:', {
            tpGtId: tp.gtAnnotation.id,
            tpPredId: tp.predAnnotation.id,
            searchingId: firstAnnotation.id,
            isFromGTDataset,
            iou: tp.iou,
          });

          if (isFromGTDataset && tp.gtAnnotation.id === firstAnnotation.id) {
            // This is a GT annotation, found its TP match
            console.debug('Found GT TP match!');
            matches.push({
              type: 'tp' as const,
              gtAnnotation: tp.gtAnnotation,
              predAnnotation: tp.predAnnotation,
              iou: tp.iou,
            });
          } else if (!isFromGTDataset && tp.predAnnotation.id === firstAnnotation.id) {
            // This is a Pred annotation, found its TP match
            console.debug('Found Pred TP match!');
            matches.push({
              type: 'tp' as const,
              gtAnnotation: tp.gtAnnotation,
              predAnnotation: tp.predAnnotation,
              iou: tp.iou,
            });
          }
        }

        // Check below threshold matches for FP/FN annotations
        if (matches.length === 0 && imageDiff.belowThresholdMatches) {
          console.debug(
            'Checking below threshold matches:',
            imageDiff.belowThresholdMatches.length
          );
          for (const btm of imageDiff.belowThresholdMatches) {
            console.debug('Checking below threshold match:', {
              btmGtId: btm.gtAnnotation.id,
              btmPredId: btm.predAnnotation.id,
              searchingId: firstAnnotation.id,
              isFromGTDataset,
              iou: btm.iou,
            });

            if (isFromGTDataset && btm.gtAnnotation.id === firstAnnotation.id) {
              // This is a GT annotation with below threshold match
              console.debug('Found GT below threshold match!');
              matches.push({
                type: 'below-threshold' as const,
                gtAnnotation: btm.gtAnnotation,
                predAnnotation: btm.predAnnotation,
                iou: btm.iou,
              });
            } else if (!isFromGTDataset && btm.predAnnotation.id === firstAnnotation.id) {
              // This is a Pred annotation with below threshold match
              console.debug('Found Pred below threshold match!');
              matches.push({
                type: 'below-threshold' as const,
                gtAnnotation: btm.gtAnnotation,
                predAnnotation: btm.predAnnotation,
                iou: btm.iou,
              });
            }
          }
        }

        // Check FP (only for Pred annotations)
        const isFP =
          !isFromGTDataset && imageDiff.falsePositives.some((fp) => fp.id === firstAnnotation.id);

        // Check FN (only for GT annotations)
        const isFN =
          isFromGTDataset && imageDiff.falseNegatives.some((fn) => fn.id === firstAnnotation.id);

        // Determine annotation type
        // Only consider TP if there are matches above threshold (not below-threshold matches)
        const hasTPMatch = matches.some((m) => m.type === 'tp');

        let annotationType: 'tp' | 'fp' | 'fn' = 'fp';
        if (hasTPMatch) {
          annotationType = 'tp';
        } else if (isFN) {
          annotationType = 'fn';
        } else if (isFP) {
          annotationType = 'fp';
        }

        console.debug('Final match results:', {
          annotationType,
          hasTPMatch,
          isFP,
          isFN,
          matchesFound: matches.length,
          matches: matches.map((m) => ({
            type: m.type,
            iou: m.iou,
            gtId: m.gtAnnotation.id,
            predId: m.predAnnotation.id,
          })),
        });

        comparison = {
          type: annotationType,
          isGT: isFromGTDataset,
          matches,
          annotation: firstAnnotation,
        };
      }
    }

    return { selectedAnnotations: selected, comparisonInfo: comparison };
  }, [
    selectedAnnotationIds,
    cocoData,
    isComparing,
    comparisonData,
    diffResults,
    comparisonSettings,
  ]);

  // Toggle section collapse
  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Copy entire JSON
  const copyJSON = () => {
    if (selectedAnnotations.length === 1) {
      copyToClipboard(JSON.stringify(selectedAnnotations[0], null, 2));
    } else {
      copyToClipboard(JSON.stringify(selectedAnnotations, null, 2));
    }
  };

  // Render field
  const renderField = (
    label: string,
    value: string | number | boolean | object,
    copyable = true
  ) => {
    const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

    return (
      <div className="detail-field">
        <span className="detail-field-label">{label}:</span>
        <span className="detail-field-value">{displayValue}</span>
        {copyable && (
          <button
            className="detail-field-copy"
            onClick={() => copyToClipboard(displayValue)}
            title={t('common.copyToClipboard')}
          >
            📋
          </button>
        )}
      </div>
    );
  };

  // Render JSON field with formatting
  const renderJSONField = (label: string, value: object) => {
    const jsonString = JSON.stringify(value, null, 2);

    return (
      <div className="detail-field detail-field-json">
        <div className="detail-field-header">
          <span className="detail-field-label">{label}:</span>
          <button
            className="detail-field-copy"
            onClick={() => copyToClipboard(jsonString)}
            title={t('common.copyToClipboard')}
          >
            📋
          </button>
        </div>
        <pre className="detail-field-json-content">{jsonString}</pre>
      </div>
    );
  };

  // Render segmentation info
  const renderSegmentation = (segmentation: number[][]) => {
    const totalPoints = segmentation.reduce((sum, poly) => sum + poly.length / 2, 0);
    const polygons = segmentation.length;

    return (
      <div>
        <div className="segmentation-summary">
          {t('detail.polygons')}: {polygons}, {t('detail.points')}: {totalPoints}
        </div>
        <div className="segmentation-points">
          {segmentation.map((poly, i) => (
            <div key={i}>
              <strong>
                {t('detail.polygon')} {i + 1} ({poly.length / 2} {t('detail.points').toLowerCase()}
                ):
              </strong>
              <pre>{JSON.stringify(poly, null, 2)}</pre>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render promoted field section
  const renderPromotedField = (fieldPath: string, annotation: COCOAnnotation) => {
    if (!hasFieldPath(annotation, fieldPath)) {
      return null;
    }

    const value = getValueByPath(annotation, fieldPath);
    const displayName =
      fieldPath
        .split('.')
        .pop()
        ?.replace(/[_-]/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ') || fieldPath;

    const sectionKey = `promoted-${fieldPath}`;

    return (
      <div key={fieldPath} className="detail-section">
        <div
          className={`detail-section-header ${collapsedSections.has(sectionKey) ? 'collapsed' : ''}`}
          onClick={() => toggleSection(sectionKey)}
        >
          <span className="detail-section-toggle">▼</span>
          <h3 className="detail-section-title">{displayName}</h3>
        </div>
        <div className="detail-section-content">
          {typeof value === 'object' && value !== null
            ? renderJSONField(displayName, value)
            : renderField(displayName, value as string | number | boolean)}
        </div>
      </div>
    );
  };

  // Render single annotation details
  const renderAnnotationDetails = (annotation: COCOAnnotation) => {
    const category = getCategoryById(annotation.category_id);
    const image = cocoData?.images.find((img) => img.id === annotation.image_id);

    return (
      <div>
        {/* Basic Information */}
        <div className="detail-section">
          <div
            className={`detail-section-header ${collapsedSections.has('basic') ? 'collapsed' : ''}`}
            onClick={() => toggleSection('basic')}
          >
            <span className="detail-section-toggle">▼</span>
            <h3 className="detail-section-title">{t('detail.basicInfo')}</h3>
          </div>
          <div className="detail-section-content">
            {renderField(t('common.id'), annotation.id)}
            {renderField(t('detail.categoryId'), annotation.category_id)}
            {category && renderField(t('detail.categoryName'), category.name)}
            {renderField(t('info.imageId'), annotation.image_id)}
            {image && renderField(t('detail.imageFile'), image.file_name)}
            {renderField(
              t('detail.isCrowd'),
              annotation.iscrowd === 1 ? t('common.yes') : t('common.no')
            )}
          </div>
        </div>

        {/* Spatial Information */}
        <div className="detail-section">
          <div
            className={`detail-section-header ${collapsedSections.has('spatial') ? 'collapsed' : ''}`}
            onClick={() => toggleSection('spatial')}
          >
            <span className="detail-section-toggle">▼</span>
            <h3 className="detail-section-title">{t('detail.spatialInfo')}</h3>
          </div>
          <div className="detail-section-content">
            {renderField(t('detail.area'), annotation.area.toFixed(2))}
            {renderField(
              t('detail.boundingBox'),
              `[${annotation.bbox.map((v) => v.toFixed(1)).join(', ')}]`
            )}
            {renderField('X', annotation.bbox[0].toFixed(1))}
            {renderField('Y', annotation.bbox[1].toFixed(1))}
            {renderField(t('detail.width'), annotation.bbox[2].toFixed(1))}
            {renderField(t('detail.height'), annotation.bbox[3].toFixed(1))}
          </div>
        </div>

        {/* Segmentation */}
        {annotation.segmentation && (
          <div className="detail-section">
            <div
              className={`detail-section-header ${collapsedSections.has('segmentation') ? 'collapsed' : ''}`}
              onClick={() => toggleSection('segmentation')}
            >
              <span className="detail-section-toggle">▼</span>
              <h3 className="detail-section-title">{t('detail.segmentation')}</h3>
            </div>
            <div className="detail-section-content">
              {renderSegmentation(annotation.segmentation)}
            </div>
          </div>
        )}

        {/* Promoted Fields */}
        {detail.promotedFields.map((fieldPath) => renderPromotedField(fieldPath, annotation))}
      </div>
    );
  };

  // Render content based on selection
  const renderContent = () => {
    if (selectedAnnotations.length === 0) {
      return (
        <div className="detail-empty-state">
          <p>{t('detail.noSelection')}</p>
          <p>{t('detail.clickToView')}</p>
        </div>
      );
    }

    if (viewMode === 'json') {
      return (
        <div className="detail-json-view">
          <pre>
            {selectedAnnotations.length === 1
              ? JSON.stringify(selectedAnnotations[0], null, 2)
              : JSON.stringify(selectedAnnotations, null, 2)}
          </pre>
        </div>
      );
    }

    // Show comparison sections if in comparison mode
    if (isComparing && comparisonInfo) {
      return renderComparisonSections();
    }

    // Single mode or non-comparison
    if (selectedAnnotations.length === 1) {
      return renderAnnotationDetails(selectedAnnotations[0]);
    }

    // Multiple selection
    return (
      <div>
        <div className="detail-multi-select-info">
          {t('detail.multipleSelected', { count: selectedAnnotations.length })}
        </div>
        {selectedAnnotations.map((ann) => (
          <div key={ann.id} style={{ marginBottom: '2rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>
              {t('detail.annotation')} #{ann.id}
            </h4>
            {renderAnnotationDetails(ann)}
          </div>
        ))}
      </div>
    );
  };

  // Render comparison mode result section
  const renderComparisonResultSection = () => {
    if (!comparisonInfo) return null;

    const { type, isGT, matches } = comparisonInfo;

    return (
      <div className="detail-section comparison-result">
        <div className="detail-section-header">
          <h3 className="detail-section-title">{t('detail.comparisonResult')}</h3>
        </div>
        <div className="detail-section-content">
          <div className="result-info">
            <div className="result-type">
              <strong>{t('detail.type')}: </strong>
              <span className={`result-badge result-${type}`}>{type.toUpperCase()}</span>
            </div>
            <div className="result-role">
              <strong>{t('detail.role')}: </strong>
              <span className={`role-badge ${isGT ? 'gt' : 'pred'}`}>
                {isGT ? t('detail.groundTruth') : t('detail.prediction')}
              </span>
            </div>
            {matches.length > 0 && (
              <div className="result-matches">
                <strong>{t('detail.matches')}: </strong>
                {matches.map((match, idx) => (
                  <span key={idx} className="match-iou">
                    IoU: {match.iou.toFixed(3)}
                    {idx < matches.length - 1 && ', '}
                  </span>
                ))}
              </div>
            )}
            {matches.length === 0 && (
              <div className="result-no-match">
                <span className="no-match-text">{t('detail.noMatchingPartner')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render GT/Pred sections for comparison mode
  const renderComparisonSections = () => {
    if (!comparisonInfo) return null;

    const { matches, annotation, isGT } = comparisonInfo;

    return (
      <>
        {/* Current annotation section */}
        <div className="detail-section">
          <div className="detail-section-header">
            <h3 className="detail-section-title">
              {isGT ? t('detail.groundTruthAnnotation') : t('detail.predictionAnnotation')}
            </h3>
          </div>
          <div className="detail-section-content">
            {renderAnnotationContent(annotation as COCOAnnotation & { _source?: string })}
          </div>
        </div>

        {/* Matching partner sections */}
        {matches.length > 0 ? (
          matches.map((match, idx) => {
            const partnerAnnotation = isGT ? match.predAnnotation : match.gtAnnotation;
            const partnerLabel = isGT
              ? t('detail.predictionAnnotation')
              : t('detail.groundTruthAnnotation');

            return (
              <div key={idx} className="detail-section">
                <div className="detail-section-header">
                  <h3 className="detail-section-title">
                    {partnerLabel} {matches.length > 1 ? `(${idx + 1})` : ''}
                    <span className="partner-iou">IoU: {match.iou.toFixed(3)}</span>
                  </h3>
                </div>
                <div className="detail-section-content">
                  {renderAnnotationContent(
                    partnerAnnotation as COCOAnnotation & { _source?: string }
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="detail-section">
            <div className="detail-section-header">
              <h3 className="detail-section-title">
                {isGT ? t('detail.predictionAnnotation') : t('detail.groundTruthAnnotation')}
              </h3>
            </div>
            <div className="detail-section-content">
              <div className="no-partner-message">{t('detail.noMatchingPartner')}</div>
            </div>
          </div>
        )}
      </>
    );
  };

  // Render annotation content (used for both single and comparison modes)
  const renderAnnotationContent = (annotation: COCOAnnotation & { _source?: string }) => {
    const category = getCategoryById(annotation.category_id);

    return (
      <>
        {/* Basic info */}
        <div className="annotation-basic-info">
          <div>
            <strong>{t('detail.id')}: </strong>
            {annotation.id}
          </div>
          <div>
            <strong>{t('detail.category')}: </strong>
            {category?.name || annotation.category_id}
          </div>
          <div>
            <strong>{t('detail.area')}: </strong>
            {annotation.area?.toFixed(2) || 'N/A'}
          </div>
          <div>
            <strong>{t('detail.iscrowd')}: </strong>
            {annotation.iscrowd ? t('detail.yes') : t('detail.no')}
          </div>
        </div>

        {/* Bounding box */}
        <div className="bbox-info">
          <strong>{t('detail.boundingBox')}: </strong>[
          {annotation.bbox.map((val: number) => val.toFixed(1)).join(', ')}]
        </div>

        {/* Segmentation */}
        {annotation.segmentation && annotation.segmentation.length > 0 && (
          <div className="segmentation-info">
            <strong>{t('detail.segmentation')}: </strong>
            {renderSegmentation(annotation.segmentation)}
          </div>
        )}

        {/* Custom fields */}
        {detail.promotedFields.map((field) => renderPromotedField(field, annotation))}
      </>
    );
  };

  return (
    <div className="annotation-detail-panel">
      {selectedAnnotations.length > 0 && (
        <>
          {/* Show comparison result section if in comparison mode */}
          {isComparing && comparisonInfo && renderComparisonResultSection()}

          <div className="detail-view-toggle">
            <button
              className={viewMode === 'formatted' ? 'active' : ''}
              onClick={() => setViewMode('formatted')}
            >
              {t('detail.formatted')}
            </button>
            <button
              className={viewMode === 'json' ? 'active' : ''}
              onClick={() => setViewMode('json')}
            >
              {t('detail.json')}
            </button>
          </div>

          {viewMode === 'json' && (
            <button
              style={{
                width: '100%',
                marginBottom: '1rem',
                padding: '0.5rem',
                background: 'var(--color-brand-primary)',
                color: 'var(--color-text-inverse)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              onClick={copyJSON}
            >
              {t('detail.copyJson')}
            </button>
          )}
        </>
      )}

      {renderContent()}
    </div>
  );
};

export default AnnotationDetailPanel;
