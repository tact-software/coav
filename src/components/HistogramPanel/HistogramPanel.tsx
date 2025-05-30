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
    setHistogramType,
    setBinCount,
    setScale,
    toggleCategory,
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

  // ハイライト機能は無効化（メインビューアーとの連携不要）
  // useEffect(() => {
  //   if (highlightedAnnotations.size > 0) {
  //     const { clearSelection, selectAnnotation } = useAnnotationStore.getState();
  //     clearSelection();
  //     highlightedAnnotations.forEach((id) => selectAnnotation(id, true));
  //   }
  // }, [highlightedAnnotations]);

  const handleCopyToClipboard = async () => {
    if (!histogramData) {
      console.error('No histogram data available for copy');
      return;
    }

    try {
      const csv = exportHistogramAsCSV(histogramData, categoryMap);
      
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(csv);
        
        // 成功メッセージを表示
        const toast = document.createElement('div');
        toast.textContent = 'ヒストグラムデータをクリップボードにコピーしました';
        toast.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #28a745;
          color: white;
          padding: 12px 20px;
          border-radius: 4px;
          z-index: 10000;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          font-size: 14px;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 3000);
        
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch (error) {
      // フォールバック: テキストエリアで選択可能にする
      const csv = exportHistogramAsCSV(histogramData, categoryMap);
      
      const container = document.createElement('div');
      container.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 2px solid #ccc;
        border-radius: 8px;
        padding: 20px;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        max-width: 80%;
        max-height: 80%;
      `;
      
      const message = document.createElement('p');
      message.textContent = 'クリップボードへのコピーが失敗しました。下のテキストを手動でコピーしてください:';
      message.style.cssText = 'margin: 0 0 15px 0; color: #333; line-height: 1.4;';
      
      const textarea = document.createElement('textarea');
      textarea.value = csv;
      textarea.style.cssText = `
        width: 100%;
        height: 200px;
        font-family: monospace;
        font-size: 12px;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 8px;
        margin-bottom: 10px;
      `;
      textarea.readOnly = true;
      
      const closeButton = document.createElement('button');
      closeButton.textContent = '閉じる';
      closeButton.style.cssText = `
        padding: 8px 16px;
        background: #6c757d;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      `;
      closeButton.onclick = () => document.body.removeChild(container);
      
      container.appendChild(message);
      container.appendChild(textarea);
      container.appendChild(closeButton);
      document.body.appendChild(container);
      
      // テキストエリアを選択状態にする
      textarea.focus();
      textarea.select();
    }
  };

  // ハイライト機能を無効化
  const handleBinClick = () => {
    // クリック時の動作を無効化
  };

  const handleBinHover = () => {
    // ホバー時の動作を無効化
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

          {/* クリップボードコピーボタン */}
          <div className="control-group">
            <label>{t('histogram.copy')}</label>
            <button
              className="btn btn-secondary"
              onClick={handleCopyToClipboard}
              disabled={!histogramData}
            >
              {t('histogram.copy')}
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
            <div className="statistic-card">
              <div className="statistic-value">
                {formatValue(histogramData.statistics.q1, histogramData.type)}
              </div>
              <div className="statistic-label">{t('histogram.q1')}</div>
            </div>
            <div className="statistic-card">
              <div className="statistic-value">
                {formatValue(histogramData.statistics.q3, histogramData.type)}
              </div>
              <div className="statistic-label">{t('histogram.q3')}</div>
            </div>
            <div className="statistic-card">
              <div className="statistic-value">
                {formatValue(histogramData.statistics.q3 - histogramData.statistics.q1, histogramData.type)}
              </div>
              <div className="statistic-label">{t('histogram.iqr')}</div>
            </div>
            <div className="statistic-card">
              <div className="statistic-value">
                {histogramData.statistics.mean > 0 ? 
                  (histogramData.statistics.std / histogramData.statistics.mean * 100).toFixed(1) + '%' : 
                  'N/A'
                }
              </div>
              <div className="statistic-label">{t('histogram.cv')}</div>
            </div>
            <div className="statistic-card">
              <div className="statistic-value">
                {histogramData.statistics.skewness.toFixed(3)}
              </div>
              <div className="statistic-label">{t('histogram.skewness')}</div>
            </div>
            <div className="statistic-card">
              <div className="statistic-value">
                {histogramData.statistics.kurtosis.toFixed(3)}
              </div>
              <div className="statistic-label">{t('histogram.kurtosis')}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
