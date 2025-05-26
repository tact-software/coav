import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnnotationStore, useImageStore } from '../../stores';
import { calculateAnnotationStatistics } from '../../utils/statistics';
import './StatisticsDialog.css';

interface StatisticsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const StatisticsDialog: React.FC<StatisticsDialogProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { cocoData, visibleCategoryIds, selectedAnnotationIds } = useAnnotationStore();
  const { imagePath } = useImageStore();

  // Calculate statistics for current image
  const currentImageStats = useMemo(() => {
    if (!cocoData || !imagePath) return null;

    // Find the current image by matching the file path
    const currentImage = cocoData.images.find(
      (img) => imagePath.endsWith(img.file_name) || img.file_name === imagePath.split('/').pop()
    );

    if (!currentImage) return null;

    return calculateAnnotationStatistics(
      cocoData,
      currentImage.id,
      visibleCategoryIds,
      selectedAnnotationIds
    );
  }, [cocoData, imagePath, visibleCategoryIds, selectedAnnotationIds]);

  // Calculate global statistics
  const globalStats = useMemo(() => {
    if (!cocoData) return null;

    const totalAnnotations = cocoData.annotations.length;
    const totalImages = cocoData.images.length;
    const totalCategories = cocoData.categories.length;

    // Category distribution
    const categoryDistribution = new Map<
      number,
      { name: string; count: number; percentage: number }
    >();
    cocoData.categories.forEach((cat) => {
      categoryDistribution.set(cat.id, { name: cat.name, count: 0, percentage: 0 });
    });

    cocoData.annotations.forEach((ann) => {
      const catData = categoryDistribution.get(ann.category_id);
      if (catData) {
        catData.count++;
      }
    });

    categoryDistribution.forEach((catData) => {
      catData.percentage = (catData.count / totalAnnotations) * 100;
    });

    // Images with/without annotations
    const imagesWithAnnotations = new Set(cocoData.annotations.map((ann) => ann.image_id)).size;
    const imagesWithoutAnnotations = totalImages - imagesWithAnnotations;

    // Average annotations per image
    const avgAnnotationsPerImage = totalAnnotations / totalImages;

    // Size statistics
    const areas = cocoData.annotations.map((ann) => ann.area);
    const minArea = Math.min(...areas);
    const maxArea = Math.max(...areas);
    const avgArea = areas.reduce((sum, area) => sum + area, 0) / areas.length;

    // Bbox size statistics
    const widths = cocoData.annotations.map((ann) => ann.bbox[2]);
    const heights = cocoData.annotations.map((ann) => ann.bbox[3]);
    const avgWidth = widths.reduce((sum, w) => sum + w, 0) / widths.length;
    const avgHeight = heights.reduce((sum, h) => sum + h, 0) / heights.length;

    return {
      totalAnnotations,
      totalImages,
      totalCategories,
      categoryDistribution: Array.from(categoryDistribution.values()).sort(
        (a, b) => b.count - a.count
      ),
      imagesWithAnnotations,
      imagesWithoutAnnotations,
      avgAnnotationsPerImage,
      minArea,
      maxArea,
      avgArea,
      avgWidth,
      avgHeight,
    };
  }, [cocoData]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add toast notification here
      console.log(`${label} copied to clipboard`);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatStatisticsText = () => {
    if (!globalStats) return '';

    let text = '=== COCO Dataset Statistics ===\n\n';

    text += '## Overview\n';
    text += `Total Images: ${globalStats.totalImages}\n`;
    text += `Total Annotations: ${globalStats.totalAnnotations}\n`;
    text += `Total Categories: ${globalStats.totalCategories}\n`;
    text += `Average Annotations per Image: ${globalStats.avgAnnotationsPerImage.toFixed(2)}\n\n`;

    text += '## Image Distribution\n';
    text += `Images with Annotations: ${globalStats.imagesWithAnnotations} (${((globalStats.imagesWithAnnotations / globalStats.totalImages) * 100).toFixed(1)}%)\n`;
    text += `Images without Annotations: ${globalStats.imagesWithoutAnnotations} (${((globalStats.imagesWithoutAnnotations / globalStats.totalImages) * 100).toFixed(1)}%)\n\n`;

    text += '## Category Distribution\n';
    globalStats.categoryDistribution.forEach((cat) => {
      text += `${cat.name}: ${cat.count} (${cat.percentage.toFixed(1)}%)\n`;
    });
    text += '\n';

    text += '## Size Statistics\n';
    text += `Area - Min: ${globalStats.minArea.toFixed(2)}, Max: ${globalStats.maxArea.toFixed(2)}, Avg: ${globalStats.avgArea.toFixed(2)}\n`;
    text += `Width - Average: ${globalStats.avgWidth.toFixed(2)} pixels\n`;
    text += `Height - Average: ${globalStats.avgHeight.toFixed(2)} pixels\n`;

    if (currentImageStats) {
      text += '\n## Current Image Statistics\n';
      text += `Total Annotations: ${currentImageStats.totalAnnotations}\n`;
      text += `Visible Annotations: ${currentImageStats.visibleAnnotations}\n`;
      text += `Selected Annotations: ${currentImageStats.selectedAnnotations}\n`;
      text += `Coverage: ${currentImageStats.coveragePercentage.toFixed(1)}%\n`;
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
          {globalStats ? (
            <>
              {/* Overview Section */}
              <div className="statistics-section">
                <h3>{t('statistics.dataset')}</h3>
                <div className="statistics-grid">
                  <div className="statistic-card">
                    <div className="statistic-value">{globalStats.totalImages}</div>
                    <div className="statistic-label">{t('statistics.images')}</div>
                  </div>
                  <div className="statistic-card">
                    <div className="statistic-value">{globalStats.totalAnnotations}</div>
                    <div className="statistic-label">{t('statistics.annotations')}</div>
                  </div>
                  <div className="statistic-card">
                    <div className="statistic-value">{globalStats.totalCategories}</div>
                    <div className="statistic-label">{t('statistics.categories')}</div>
                  </div>
                  <div className="statistic-card">
                    <div className="statistic-value">
                      {globalStats.avgAnnotationsPerImage.toFixed(2)}
                    </div>
                    <div className="statistic-label">{t('statistics.avgPerImage')}</div>
                  </div>
                </div>
              </div>

              {/* Category Distribution */}
              <div className="statistics-section">
                <h3>{t('statistics.categoryBreakdown')}</h3>
                <div className="category-distribution">
                  {globalStats.categoryDistribution.map((cat) => (
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

              {/* Image Distribution */}
              <div className="statistics-section">
                <h3>{t('controls.images')}</h3>
                <div className="statistics-grid">
                  <div className="statistic-card">
                    <div className="statistic-value">{globalStats.imagesWithAnnotations}</div>
                    <div className="statistic-label">{t('statistics.images')}</div>
                    <div className="statistic-percentage">
                      {(
                        (globalStats.imagesWithAnnotations / globalStats.totalImages) *
                        100
                      ).toFixed(1)}
                      %
                    </div>
                  </div>
                  <div className="statistic-card">
                    <div className="statistic-value">{globalStats.imagesWithoutAnnotations}</div>
                    <div className="statistic-label">{t('statistics.images')}</div>
                    <div className="statistic-percentage">
                      {(
                        (globalStats.imagesWithoutAnnotations / globalStats.totalImages) *
                        100
                      ).toFixed(1)}
                      %
                    </div>
                  </div>
                </div>
              </div>

              {/* Size Statistics */}
              <div className="statistics-section">
                <h3>{t('statistics.annotationSizes')}</h3>
                <div className="statistics-grid">
                  <div className="statistic-card">
                    <div className="statistic-value">{globalStats.avgArea.toFixed(0)}</div>
                    <div className="statistic-label">
                      {t('statistics.average')} {t('detail.area')}
                    </div>
                  </div>
                  <div className="statistic-card">
                    <div className="statistic-value">{globalStats.avgWidth.toFixed(0)}</div>
                    <div className="statistic-label">
                      {t('statistics.average')} {t('detail.width')}
                    </div>
                  </div>
                  <div className="statistic-card">
                    <div className="statistic-value">{globalStats.avgHeight.toFixed(0)}</div>
                    <div className="statistic-label">
                      {t('statistics.average')} {t('detail.height')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Image Statistics */}
              {currentImageStats && (
                <div className="statistics-section">
                  <h3>{t('controls.images')}</h3>
                  <div className="statistics-grid">
                    <div className="statistic-card">
                      <div className="statistic-value">{currentImageStats.totalAnnotations}</div>
                      <div className="statistic-label">{t('statistics.annotations')}</div>
                    </div>
                    <div className="statistic-card">
                      <div className="statistic-value">{currentImageStats.visibleAnnotations}</div>
                      <div className="statistic-label">
                        {t('info.visible')} {t('controls.annotations')}
                      </div>
                    </div>
                    <div className="statistic-card">
                      <div className="statistic-value">{currentImageStats.selectedAnnotations}</div>
                      <div className="statistic-label">
                        {t('info.selected')} {t('controls.annotations')}
                      </div>
                    </div>
                    <div className="statistic-card">
                      <div className="statistic-value">
                        {currentImageStats.coveragePercentage.toFixed(1)}%
                      </div>
                      <div className="statistic-label">{t('info.coverage')}</div>
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
            onClick={() => copyToClipboard(formatStatisticsText(), 'Statistics')}
            disabled={!globalStats}
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
