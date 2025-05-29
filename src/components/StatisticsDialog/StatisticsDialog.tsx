import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnnotationStore } from '../../stores';
import { calculateAnnotationStatistics } from '../../utils/statistics';
import './StatisticsDialog.css';

interface StatisticsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const StatisticsDialog: React.FC<StatisticsDialogProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { cocoData, visibleCategoryIds, selectedAnnotationIds, currentImageId } =
    useAnnotationStore();
  const [viewMode, setViewMode] = useState<'current' | 'all'>('all');

  // Calculate statistics based on view mode
  const statistics = useMemo(() => {
    if (!cocoData) return null;

    if (viewMode === 'current' && currentImageId) {
      return calculateAnnotationStatistics(
        cocoData,
        currentImageId,
        visibleCategoryIds,
        selectedAnnotationIds
      );
    } else {
      // Calculate for all images
      return calculateAnnotationStatistics(
        cocoData,
        null,
        visibleCategoryIds,
        selectedAnnotationIds
      );
    }
  }, [cocoData, currentImageId, viewMode, visibleCategoryIds, selectedAnnotationIds]);

  const hasMultipleImages = cocoData && cocoData.images && cocoData.images.length > 1;

  // Calculate dataset-level statistics (always for all data)
  const datasetStats = useMemo(() => {
    if (!cocoData) return null;

    const totalAnnotations = cocoData.annotations.length;
    const totalImages = cocoData.images.length;
    const totalCategories = cocoData.categories.length;

    // Images with/without annotations
    const imagesWithAnnotations = new Set(cocoData.annotations.map((ann) => ann.image_id)).size;
    const imagesWithoutAnnotations = totalImages - imagesWithAnnotations;

    // Average annotations per image
    const avgAnnotationsPerImage = totalAnnotations / totalImages;

    return {
      totalAnnotations,
      totalImages,
      totalCategories,
      imagesWithAnnotations,
      imagesWithoutAnnotations,
      avgAnnotationsPerImage,
    };
  }, [cocoData]);

  // Calculate view-specific statistics (category distribution and sizes)
  const viewStats = useMemo(() => {
    if (!cocoData) return null;

    // Filter annotations based on view mode
    const annotations =
      viewMode === 'current' && currentImageId
        ? cocoData.annotations.filter((ann) => ann.image_id === currentImageId)
        : cocoData.annotations;

    if (annotations.length === 0) return null;

    // Category distribution
    const categoryDistribution = new Map<
      number,
      { name: string; count: number; percentage: number }
    >();
    cocoData.categories.forEach((cat) => {
      categoryDistribution.set(cat.id, { name: cat.name, count: 0, percentage: 0 });
    });

    annotations.forEach((ann) => {
      const catData = categoryDistribution.get(ann.category_id);
      if (catData) {
        catData.count++;
      }
    });

    const totalCount = annotations.length;
    categoryDistribution.forEach((catData) => {
      catData.percentage = totalCount > 0 ? (catData.count / totalCount) * 100 : 0;
    });

    // Size statistics
    const areas = annotations.map((ann) => ann.area);
    const minArea = Math.min(...areas);
    const maxArea = Math.max(...areas);
    const avgArea = areas.reduce((sum, area) => sum + area, 0) / areas.length;

    // Bbox size statistics
    const widths = annotations.map((ann) => ann.bbox[2]);
    const heights = annotations.map((ann) => ann.bbox[3]);
    const avgWidth = widths.reduce((sum, w) => sum + w, 0) / widths.length;
    const avgHeight = heights.reduce((sum, h) => sum + h, 0) / heights.length;

    return {
      categoryDistribution: Array.from(categoryDistribution.values())
        .filter((cat) => cat.count > 0)
        .sort((a, b) => b.count - a.count),
      minArea,
      maxArea,
      avgArea,
      avgWidth,
      avgHeight,
    };
  }, [cocoData, viewMode, currentImageId]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatStatisticsText = () => {
    if (!datasetStats) return '';

    let text = '=== COCO Dataset Statistics ===\n\n';

    text += '## Dataset Overview\n';
    text += `Total Images: ${datasetStats.totalImages}\n`;
    text += `Total Annotations: ${datasetStats.totalAnnotations}\n`;
    text += `Total Categories: ${datasetStats.totalCategories}\n`;
    text += `Average Annotations per Image: ${datasetStats.avgAnnotationsPerImage.toFixed(2)}\n\n`;

    text += '## Image Distribution\n';
    text += `Images with Annotations: ${datasetStats.imagesWithAnnotations} (${((datasetStats.imagesWithAnnotations / datasetStats.totalImages) * 100).toFixed(1)}%)\n`;
    text += `Images without Annotations: ${datasetStats.imagesWithoutAnnotations} (${((datasetStats.imagesWithoutAnnotations / datasetStats.totalImages) * 100).toFixed(1)}%)\n\n`;

    if (viewStats) {
      text += `## View Statistics (${viewMode === 'current' ? 'Current Image' : 'All Images'})\n\n`;

      text += '### Category Distribution\n';
      viewStats.categoryDistribution.forEach((cat) => {
        text += `${cat.name}: ${cat.count} (${cat.percentage.toFixed(1)}%)\n`;
      });
      text += '\n';

      text += '### Size Statistics\n';
      text += `Area - Min: ${viewStats.minArea.toFixed(2)}, Max: ${viewStats.maxArea.toFixed(2)}, Avg: ${viewStats.avgArea.toFixed(2)}\n`;
      text += `Width - Average: ${viewStats.avgWidth.toFixed(2)} pixels\n`;
      text += `Height - Average: ${viewStats.avgHeight.toFixed(2)} pixels\n`;
    }

    if (statistics) {
      text += '\n## Current View Statistics\n';
      text += `Total Annotations: ${statistics.totalAnnotations}\n`;
      text += `Visible Annotations: ${statistics.visibleAnnotations}\n`;
      text += `Selected Annotations: ${statistics.selectedAnnotations}\n`;
      text += `Coverage: ${statistics.coveragePercentage.toFixed(1)}%\n`;
    }

    return text;
  };

  if (!isOpen) return null;

  return (
    <div className="statistics-dialog-overlay" onClick={onClose}>
      <div className="statistics-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="statistics-dialog-header">
          <h2>{t('statistics.title')}</h2>
          <button className="statistics-dialog-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="statistics-dialog-content">
          {datasetStats ? (
            <>
              {/* Dataset Overview Section - Always at top */}
              <div className="statistics-section">
                <h3>{t('statistics.dataset')}</h3>
                <div className="statistics-grid">
                  <div className="statistic-card">
                    <div className="statistic-value">{datasetStats.totalImages}</div>
                    <div className="statistic-label">{t('statistics.images')}</div>
                  </div>
                  <div className="statistic-card">
                    <div className="statistic-value">{datasetStats.totalAnnotations}</div>
                    <div className="statistic-label">{t('statistics.annotations')}</div>
                  </div>
                  <div className="statistic-card">
                    <div className="statistic-value">{datasetStats.totalCategories}</div>
                    <div className="statistic-label">{t('statistics.categories')}</div>
                  </div>
                  <div className="statistic-card">
                    <div className="statistic-value">
                      {datasetStats.avgAnnotationsPerImage.toFixed(2)}
                    </div>
                    <div className="statistic-label">{t('statistics.avgPerImage')}</div>
                  </div>
                </div>
              </div>

              {/* View Mode Toggle for Annotation Statistics */}
              {hasMultipleImages && statistics && (
                <div className="view-mode-section">
                  <h3>{t('statistics.annotationStatistics')}</h3>
                  <div className="view-mode-toggle">
                    <button
                      className={viewMode === 'current' ? 'active' : ''}
                      onClick={() => setViewMode('current')}
                    >
                      {t('infoPanel.currentImage')}
                    </button>
                    <button
                      className={viewMode === 'all' ? 'active' : ''}
                      onClick={() => setViewMode('all')}
                    >
                      {t('infoPanel.allImages')}
                    </button>
                  </div>
                </div>
              )}

              {/* Category Distribution */}
              {viewStats && viewStats.categoryDistribution.length > 0 && (
                <div className="statistics-section">
                  <h3>
                    {t('statistics.categoryBreakdown')}
                    {hasMultipleImages &&
                      ` - ${viewMode === 'current' ? t('infoPanel.currentImage') : t('infoPanel.allImages')}`}
                  </h3>
                  <div className="category-distribution">
                    {viewStats.categoryDistribution.map((cat) => (
                      <div key={cat.name} className="category-stat">
                        <div className="category-info">
                          <span className="category-name">{cat.name}</span>
                          <span className="category-count">{cat.count}</span>
                        </div>
                        <div className="category-bar-container">
                          <div className="category-bar" style={{ width: `${cat.percentage}%` }} />
                          <span className="category-percentage">{cat.percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Annotation Statistics based on view mode */}
              {statistics && (
                <div className="statistics-section">
                  <h3>
                    {t('statistics.annotationStatistics')}
                    {hasMultipleImages &&
                      ` - ${viewMode === 'current' ? t('infoPanel.currentImage') : t('infoPanel.allImages')}`}
                  </h3>
                  <div className="statistics-grid">
                    <div className="statistic-card">
                      <div className="statistic-value">{statistics.totalAnnotations}</div>
                      <div className="statistic-label">{t('statistics.annotations')}</div>
                    </div>
                    <div className="statistic-card">
                      <div className="statistic-value">{statistics.visibleAnnotations}</div>
                      <div className="statistic-label">
                        {t('info.visible')} {t('controls.annotations')}
                      </div>
                    </div>
                    <div className="statistic-card">
                      <div className="statistic-value">{statistics.selectedAnnotations}</div>
                      <div className="statistic-label">
                        {t('info.selected')} {t('controls.annotations')}
                      </div>
                    </div>
                    <div className="statistic-card">
                      <div className="statistic-value">
                        {statistics.coveragePercentage.toFixed(1)}%
                      </div>
                      <div className="statistic-label">{t('info.coverage')}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Size Statistics */}
              {viewStats && (
                <div className="statistics-section">
                  <h3>
                    {t('statistics.annotationSizes')}
                    {hasMultipleImages &&
                      ` - ${viewMode === 'current' ? t('infoPanel.currentImage') : t('infoPanel.allImages')}`}
                  </h3>
                  <div className="statistics-grid">
                    <div className="statistic-card">
                      <div className="statistic-value">{viewStats.avgArea.toFixed(0)}</div>
                      <div className="statistic-label">
                        {t('statistics.average')} {t('detail.area')}
                      </div>
                    </div>
                    <div className="statistic-card">
                      <div className="statistic-value">{viewStats.avgWidth.toFixed(0)}</div>
                      <div className="statistic-label">
                        {t('statistics.average')} {t('detail.width')}
                      </div>
                    </div>
                    <div className="statistic-card">
                      <div className="statistic-value">{viewStats.avgHeight.toFixed(0)}</div>
                      <div className="statistic-label">
                        {t('statistics.average')} {t('detail.height')}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="statistics-empty">
              <p>{t('info.noImageLoaded')}</p>
            </div>
          )}
        </div>

        <div className="statistics-dialog-footer">
          <button
            className="btn btn-secondary"
            onClick={() => copyToClipboard(formatStatisticsText())}
            disabled={!datasetStats}
          >
            {t('common.copyToClipboard')}
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatisticsDialog;
