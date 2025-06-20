import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useAnnotationStore,
  useImageStore,
  useSettingsStore,
  generateCategoryColor,
} from '../../stores';
import { calculateAnnotationStatistics, formatNumber } from '../../utils/statistics';
import './InfoPanel.css';

const InfoPanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    cocoData,
    selectedAnnotationIds,
    visibleCategoryIds,
    currentImageId,
    isComparing,
    diffResults,
  } = useAnnotationStore();

  const { colors } = useSettingsStore();
  const { imagePath } = useImageStore();
  const [viewMode, setViewMode] = useState<'current' | 'all'>('current');

  // Get current image from COCO data
  const currentImage = useMemo(() => {
    if (!cocoData || !imagePath) return null;
    // Find image by matching file name
    const fileName = imagePath.split('/').pop() || '';
    return cocoData.images.find((img) => img.file_name === fileName) || null;
  }, [cocoData, imagePath]);

  const statistics = useMemo(() => {
    if (!cocoData) return null;

    // Use currentImageId if viewing current image only, otherwise null for all images
    const imageIdToUse = viewMode === 'current' && currentImageId ? currentImageId : null;

    return calculateAnnotationStatistics(
      cocoData,
      imageIdToUse,
      visibleCategoryIds,
      selectedAnnotationIds
    );
  }, [cocoData, currentImageId, viewMode, visibleCategoryIds, selectedAnnotationIds]);

  // Calculate comparison statistics for current view
  const comparisonStats = useMemo(() => {
    if (!isComparing) {
      return null;
    }

    if (!diffResults || diffResults.size === 0) {
      return null;
    }

    // Try to get result for current image, or use first available result
    let resultToUse = null;
    if (currentImageId && diffResults.has(currentImageId)) {
      resultToUse = diffResults.get(currentImageId);
    } else {
      // Use first available result
      const firstEntry = diffResults.entries().next().value;
      if (firstEntry) {
        resultToUse = firstEntry[1];
      }
    }

    if (!resultToUse) {
      return null;
    }

    // Count each type
    const tpGtCount = resultToUse.truePositives.length;
    const tpPredCount = resultToUse.truePositives.length; // Same as GT count
    const fpCount = resultToUse.falsePositives.length;
    const fnCount = resultToUse.falseNegatives.length;
    const total = tpGtCount + fpCount + fnCount;

    // Calculate metrics
    const precision = tpPredCount + fpCount > 0 ? tpPredCount / (tpPredCount + fpCount) : 0;
    const recall = tpGtCount + fnCount > 0 ? tpGtCount / (tpGtCount + fnCount) : 0;
    const f1Score = precision + recall > 0 ? (2 * (precision * recall)) / (precision + recall) : 0;

    const stats = {
      tpGt: { count: tpGtCount, percentage: total > 0 ? (tpGtCount / total) * 100 : 0 },
      tpPred: { count: tpPredCount, percentage: total > 0 ? (tpPredCount / total) * 100 : 0 },
      fp: { count: fpCount, percentage: total > 0 ? (fpCount / total) * 100 : 0 },
      fn: { count: fnCount, percentage: total > 0 ? (fnCount / total) * 100 : 0 },
      total,
      precision,
      recall,
      f1Score,
    };

    return stats;
  }, [isComparing, diffResults, currentImageId]);

  // Check if there are multiple images
  const hasMultipleImages = cocoData && cocoData.images && cocoData.images.length > 1;

  // Show empty state when no image is loaded
  if (!currentImage || !cocoData) {
    return (
      <div className="info-panel">
        <div className="empty-panel">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M13 2L3 9l10 7 10-7-10-7z" />
            <path d="M3 17l10 7 10-7" />
            <path d="M3 12l10 7 10-7" />
          </svg>
          <p>{t('info.loadImagePrompt')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="info-panel statistics-view">
      <div className="info-sections">
        {/* Image Information */}
        <div className="info-section">
          <div className="section-header">
            <h4>{t('info.imageInfo')}</h4>
          </div>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">{t('info.file')}</span>
              <span className="info-value truncate" title={currentImage.file_name}>
                {currentImage.file_name}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">{t('info.size')}</span>
              <span className="info-value">
                {formatNumber(currentImage.width)} × {formatNumber(currentImage.height)} px
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">{t('info.imageId')}</span>
              <span className="info-value">{currentImage.id}</span>
            </div>
          </div>
        </div>

        {/* View Mode Toggle - only show if multiple images */}
        {hasMultipleImages && (
          <div className="info-section">
            <div className="section-header">
              <h4>{t('info.viewMode')}</h4>
            </div>
            <div className="view-mode-toggle">
              <button
                className={`toggle-btn ${viewMode === 'current' ? 'active' : ''}`}
                onClick={() => setViewMode('current')}
              >
                {t('info.currentImageOnly')}
              </button>
              <button
                className={`toggle-btn ${viewMode === 'all' ? 'active' : ''}`}
                onClick={() => setViewMode('all')}
              >
                {t('info.allImages')}
              </button>
            </div>
          </div>
        )}

        {/* Annotation Statistics */}
        {statistics && (
          <>
            <div className="info-section">
              <div className="section-header">
                <h4>{t('info.annotationStats')}</h4>
              </div>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">{t('info.total')}</span>
                  <span className="info-value">
                    {formatNumber(statistics.totalAnnotations)}{' '}
                    {t('controls.annotations').toLowerCase()}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('info.visible')}</span>
                  <span className="info-value">
                    {formatNumber(statistics.visibleAnnotations)}{' '}
                    {t('controls.annotations').toLowerCase()}
                  </span>
                </div>
                {statistics.selectedAnnotations > 0 && (
                  <div className="info-item">
                    <span className="info-label">{t('info.selected')}</span>
                    <span className="info-value">
                      {formatNumber(statistics.selectedAnnotations)}{' '}
                      {t('controls.annotations').toLowerCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Comparison Results Distribution */}
            {isComparing && comparisonStats && viewMode === 'current' && (
              <div className="info-section">
                <div className="section-header">
                  <h4>{t('info.comparisonResults')}</h4>
                </div>
                <div className="category-list">
                  <div className="category-stat-item">
                    <div className="category-stat-header">
                      <div className="category-stat-name">
                        <div
                          className="category-indicator"
                          style={{ backgroundColor: colors.comparison?.gtColors.tp || '#4caf50' }}
                        />
                        <span>{t('controls.truePositiveGt')}</span>
                      </div>
                      <span className="category-stat-count">
                        {comparisonStats.tpGt.count} ({comparisonStats.tpGt.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="category-stat-bar">
                      <div
                        className="category-stat-bar-fill"
                        style={{
                          width: `${comparisonStats.tpGt.percentage}%`,
                          backgroundColor: colors.comparison?.gtColors.tp || '#4caf50',
                        }}
                      />
                    </div>
                  </div>
                  <div className="category-stat-item">
                    <div className="category-stat-header">
                      <div className="category-stat-name">
                        <div
                          className="category-indicator"
                          style={{ backgroundColor: colors.comparison?.predColors.tp || '#66bb6a' }}
                        />
                        <span>{t('controls.truePositivePred')}</span>
                      </div>
                      <span className="category-stat-count">
                        {comparisonStats.tpPred.count} (
                        {comparisonStats.tpPred.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="category-stat-bar">
                      <div
                        className="category-stat-bar-fill"
                        style={{
                          width: `${comparisonStats.tpPred.percentage}%`,
                          backgroundColor: colors.comparison?.predColors.tp || '#66bb6a',
                        }}
                      />
                    </div>
                  </div>
                  <div className="category-stat-item">
                    <div className="category-stat-header">
                      <div className="category-stat-name">
                        <div
                          className="category-indicator"
                          style={{ backgroundColor: colors.comparison?.predColors.fp || '#f44336' }}
                        />
                        <span>{t('controls.falsePositive')}</span>
                      </div>
                      <span className="category-stat-count">
                        {comparisonStats.fp.count} ({comparisonStats.fp.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="category-stat-bar">
                      <div
                        className="category-stat-bar-fill"
                        style={{
                          width: `${comparisonStats.fp.percentage}%`,
                          backgroundColor: colors.comparison?.predColors.fp || '#f44336',
                        }}
                      />
                    </div>
                  </div>
                  <div className="category-stat-item">
                    <div className="category-stat-header">
                      <div className="category-stat-name">
                        <div
                          className="category-indicator"
                          style={{ backgroundColor: colors.comparison?.gtColors.fn || '#ff9800' }}
                        />
                        <span>{t('controls.falseNegative')}</span>
                      </div>
                      <span className="category-stat-count">
                        {comparisonStats.fn.count} ({comparisonStats.fn.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="category-stat-bar">
                      <div
                        className="category-stat-bar-fill"
                        style={{
                          width: `${comparisonStats.fn.percentage}%`,
                          backgroundColor: colors.comparison?.gtColors.fn || '#ff9800',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Comparison Metrics */}
            {isComparing && comparisonStats && viewMode === 'current' && (
              <div className="info-section">
                <div className="section-header">
                  <h4>{t('info.comparisonMetrics')}</h4>
                </div>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Precision</span>
                    <span className="info-value">
                      {(comparisonStats.precision * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Recall</span>
                    <span className="info-value">{(comparisonStats.recall * 100).toFixed(1)}%</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">F1 Score</span>
                    <span className="info-value">
                      {(comparisonStats.f1Score * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Category Distribution */}
            {!isComparing && (
              <div className="info-section">
                <div className="section-header">
                  <h4>{t('info.categoryDistribution')}</h4>
                </div>
                <div className="category-list">
                  {statistics.categoryStats.slice(0, 5).map((stat) => {
                    const categoryColor =
                      colors.categoryColors[stat.categoryId] ||
                      generateCategoryColor(stat.categoryId);
                    const isVisible = visibleCategoryIds.includes(stat.categoryId);

                    return (
                      <div
                        key={stat.categoryId}
                        className={`category-stat-item ${!isVisible ? 'dimmed' : ''}`}
                      >
                        <div className="category-stat-header">
                          <div className="category-stat-name">
                            <div
                              className="category-indicator"
                              style={{ backgroundColor: categoryColor }}
                            />
                            <span>{stat.categoryName}</span>
                          </div>
                          <span className="category-stat-count">
                            {stat.count} ({stat.percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="category-stat-bar">
                          <div
                            className="category-stat-bar-fill"
                            style={{
                              width: `${stat.percentage}%`,
                              backgroundColor: categoryColor,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {statistics.categoryStats.length > 5 && (
                    <div className="category-stat-item more">
                      <span>
                        {t('info.moreCategories', { count: statistics.categoryStats.length - 5 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Size Analysis */}
            {statistics.sizeStats && (
              <div className="info-section">
                <div className="section-header">
                  <h4>{t('info.sizeAnalysis')}</h4>
                </div>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">{t('info.min')}</span>
                    <span className="info-value">
                      {Math.round(statistics.sizeStats.minWidth)} ×{' '}
                      {Math.round(statistics.sizeStats.minHeight)} px
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">{t('info.max')}</span>
                    <span className="info-value">
                      {Math.round(statistics.sizeStats.maxWidth)} ×{' '}
                      {Math.round(statistics.sizeStats.maxHeight)} px
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">{t('info.avg')}</span>
                    <span className="info-value">
                      {Math.round(statistics.sizeStats.avgWidth)} ×{' '}
                      {Math.round(statistics.sizeStats.avgHeight)} px
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Coverage Information */}
            <div className="info-section">
              <div className="section-header">
                <h4>{t('info.coverageAnalysis')}</h4>
              </div>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">{t('info.coverage')}</span>
                  <span className="info-value">{statistics.coveragePercentage.toFixed(1)}%</span>
                </div>
                <div className="info-item">
                  <span className="info-label">{t('info.overlapping')}</span>
                  <span className="info-value">
                    {formatNumber(statistics.overlappingCount)}{' '}
                    {t('controls.annotations').toLowerCase()}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InfoPanel;
