import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnnotationStore, useImageStore, RecentFile } from '../../stores';
import { RecentFiles } from '../RecentFiles';
import { calculateAnnotationStatistics, formatNumber } from '../../utils/statistics';
import './InfoPanel.css';

interface InfoPanelProps {
  onRecentFileSelect?: (file: RecentFile) => void;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ onRecentFileSelect }) => {
  const { t } = useTranslation();
  const { cocoData, selectedAnnotationIds, visibleCategoryIds, currentImageId } =
    useAnnotationStore();
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

  // Check if there are multiple images
  const hasMultipleImages = cocoData && cocoData.images && cocoData.images.length > 1;

  // Show recent files when no image is loaded
  if (!currentImage || !cocoData) {
    return (
      <div className="info-panel">
        <div className="panel-section">
          <div className="section-header">
            <h4>{t('info.recentFiles')}</h4>
          </div>
          {onRecentFileSelect && <RecentFiles onFileSelect={onRecentFileSelect} />}
        </div>
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

            {/* Category Distribution */}
            <div className="info-section">
              <div className="section-header">
                <h4>{t('info.categoryDistribution')}</h4>
              </div>
              <div className="category-list">
                {statistics.categoryStats.slice(0, 5).map((stat) => {
                  const hue = (stat.categoryId * 137.5) % 360;
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
                            style={{ backgroundColor: `hsl(${hue}, 50%, 50%)` }}
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
                            backgroundColor: `hsl(${hue}, 50%, 50%)`,
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
