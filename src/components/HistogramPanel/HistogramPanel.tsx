import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnnotationStore } from '../../stores/useAnnotationStore';
import { useHistogramStore, HistogramType } from '../../stores/useHistogramStore';
import { HistogramChart } from '../HistogramChart';
import { calculateHistogram, exportHistogramAsCSV } from '../../utils/histogram';
import './HistogramPanel.css';

// 値のフォーマット関数
function formatValue(value: number, type: HistogramType): string {
  switch (type) {
    case 'aspectRatio':
      return value.toFixed(2);
    case 'area':
    case 'polygonArea':
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      }
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}k`;
      }
      return Math.round(value).toString();
    default:
      return Math.round(value).toString();
  }
}

export const HistogramPanel: React.FC = () => {
  const { t } = useTranslation();
  const { cocoData, currentImageId } = useAnnotationStore();
  const {
    settings,
    histogramType,
    histogramData,
    highlightedAnnotations,
    setHistogramType,
    setBinCount,
    setScale,
    toggleCategory,
    highlightBin,
    clearHighlight,
    setHistogramData,
    setViewMode,
  } = useHistogramStore();

  // カテゴリマップを作成
  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    if (cocoData?.categories) {
      cocoData.categories.forEach((cat) => {
        map.set(cat.id, cat.name);
      });
    }
    return map;
  }, [cocoData]);

  // ヒストグラムデータを計算
  useEffect(() => {
    if (!cocoData || !cocoData.annotations || cocoData.annotations.length === 0) {
      setHistogramData(null);
      return;
    }

    const data = calculateHistogram(cocoData, histogramType, settings, currentImageId);
    setHistogramData(data);
  }, [cocoData, histogramType, settings, currentImageId, setHistogramData]);

  // ハイライトされたアノテーションを選択状態に反映
  useEffect(() => {
    if (highlightedAnnotations.size > 0) {
      const { clearSelection, selectAnnotation } = useAnnotationStore.getState();
      clearSelection();
      highlightedAnnotations.forEach((id) => selectAnnotation(id, true));
    }
  }, [highlightedAnnotations]);

  const handleExportCSV = () => {
    if (!histogramData) return;

    const csv = exportHistogramAsCSV(histogramData, categoryMap);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `histogram_${histogramType}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBinClick = (binIndex: number) => {
    highlightBin(binIndex);
  };

  const handleBinHover = (binIndex: number | null) => {
    if (binIndex === null) {
      clearHighlight();
    } else {
      highlightBin(binIndex);
    }
  };

  // 複数画像があるかチェック
  const hasMultipleImages = cocoData && cocoData.images && cocoData.images.length > 1;

  if (!cocoData || !cocoData.annotations || cocoData.annotations.length === 0) {
    return (
      <div className="histogram-empty">
        <p>{t('info.noImageLoaded')}</p>
      </div>
    );
  }

  return (
    <>
      {/* ビューモード選択セクション */}
      {hasMultipleImages && (
        <div className="statistics-section">
          <h3>{t('histogram.viewMode')}</h3>
          <div className="view-mode-toggle">
            <button
              className={settings.viewMode === 'current' ? 'active' : ''}
              onClick={() => setViewMode('current')}
            >
              {t('histogram.currentImage')}
            </button>
            <button
              className={settings.viewMode === 'all' ? 'active' : ''}
              onClick={() => setViewMode('all')}
            >
              {t('histogram.allImages')}
            </button>
          </div>
        </div>
      )}

      {/* コントロール設定セクション */}
      <div className="statistics-section">
        <h3>{t('histogram.settings')}</h3>
        <div className="histogram-controls">
          {/* 分布タイプ選択 */}
          <div className="control-group">
            <label>{t('histogram.distributionType')}</label>
            <select
              value={histogramType}
              onChange={(e) => setHistogramType(e.target.value as HistogramType)}
              className="select"
            >
              <option value="width">{t('histogram.width')}</option>
              <option value="height">{t('histogram.height')}</option>
              <option value="area">{t('histogram.area')}</option>
              <option value="polygonArea">{t('histogram.polygonArea')}</option>
              <option value="aspectRatio">{t('histogram.aspectRatio')}</option>
            </select>
          </div>

          {/* ビン数設定 */}
          <div className="control-group">
            <label>
              {t('histogram.binCount')}: {settings.binCount}
            </label>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={settings.binCount}
              onChange={(e) => setBinCount(parseInt(e.target.value))}
              className="range-input"
            />
          </div>

          {/* スケール設定 */}
          <div className="control-group">
            <label>{t('histogram.scale')}</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  value="linear"
                  checked={settings.scale === 'linear'}
                  onChange={() => setScale('linear')}
                />
                {t('histogram.linear')}
              </label>
              <label>
                <input
                  type="radio"
                  value="log"
                  checked={settings.scale === 'log'}
                  onChange={() => setScale('log')}
                  disabled={histogramType === 'aspectRatio'} // アスペクト比ではログスケール無効
                />
                {t('histogram.log')}
              </label>
            </div>
          </div>

          {/* エクスポートボタン */}
          <div className="control-group">
            <label>{t('histogram.export')}</label>
            <button
              className="btn btn-secondary"
              onClick={handleExportCSV}
              disabled={!histogramData}
            >
              {t('histogram.export')}
            </button>
          </div>
        </div>
      </div>

      {/* カテゴリフィルタセクション */}
      {cocoData.categories && cocoData.categories.length > 0 && (
        <div className="statistics-section">
          <h3>{t('histogram.categoryFilter')}</h3>
          <div className="category-chips">
            <button
              className={`chip ${settings.selectedCategories.size === 0 ? 'chip--active' : ''}`}
              onClick={() => {
                // 全カテゴリ選択をクリア
                cocoData.categories?.forEach((cat) => {
                  if (settings.selectedCategories.has(cat.id)) {
                    toggleCategory(cat.id);
                  }
                });
              }}
            >
              {t('histogram.allCategories')}
            </button>
            {cocoData.categories.map((category) => (
              <button
                key={category.id}
                className={`chip ${settings.selectedCategories.has(category.id) ? 'chip--active' : ''}`}
                onClick={() => toggleCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ヒストグラムチャート */}
      {histogramData && (
        <HistogramChart
          data={histogramData}
          categories={cocoData.categories || []}
          onBinClick={handleBinClick}
          onBinHover={handleBinHover}
          highlightedBinIndex={null}
        />
      )}

      {/* 統計情報セクション */}
      {histogramData && (
        <div className="statistics-section">
          <h3>{t('histogram.statistics')}</h3>
          <div className="statistics-grid">
            <div className="statistic-card">
              <div className="statistic-value">
                {formatValue(histogramData.statistics.mean, histogramData.type)}
              </div>
              <div className="statistic-label">{t('histogram.mean')}</div>
            </div>
            <div className="statistic-card">
              <div className="statistic-value">
                {formatValue(histogramData.statistics.median, histogramData.type)}
              </div>
              <div className="statistic-label">{t('histogram.median')}</div>
            </div>
            <div className="statistic-card">
              <div className="statistic-value">
                {formatValue(histogramData.statistics.std, histogramData.type)}
              </div>
              <div className="statistic-label">{t('histogram.std')}</div>
            </div>
            <div className="statistic-card">
              <div className="statistic-value">
                {formatValue(histogramData.statistics.min, histogramData.type)}
              </div>
              <div className="statistic-label">{t('histogram.min')}</div>
            </div>
            <div className="statistic-card">
              <div className="statistic-value">
                {formatValue(histogramData.statistics.max, histogramData.type)}
              </div>
              <div className="statistic-label">{t('histogram.max')}</div>
            </div>
            <div className="statistic-card">
              <div className="statistic-value">
                {histogramData.statistics.total.toLocaleString()}
              </div>
              <div className="statistic-label">{t('histogram.total')}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
