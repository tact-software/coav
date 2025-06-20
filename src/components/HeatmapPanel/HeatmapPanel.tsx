import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnnotationStore } from '../../stores/useAnnotationStore';
import { useHeatmapStore, HeatmapType, HeatmapSettings } from '../../stores/useHeatmapStore';
import { HeatmapChart } from '../HeatmapChart';
import { calculateHeatmap, exportHeatmapAsCSV } from '../../utils/heatmap';
import './HeatmapPanel.css';

export const HeatmapPanel: React.FC = () => {
  const { t } = useTranslation();
  const { cocoData, currentImageId } = useAnnotationStore();
  const {
    settings,
    heatmapType,
    heatmapData,
    setHeatmapType,
    setXBins,
    setYBins,
    setColorScale,
    toggleCategory,
    setViewMode,
    setHeatmapData,
  } = useHeatmapStore();

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

  // ヒートマップデータを計算
  useEffect(() => {
    if (!cocoData || !cocoData.annotations || cocoData.annotations.length === 0) {
      setHeatmapData(null);
      return;
    }

    const data = calculateHeatmap(cocoData, heatmapType, settings, currentImageId);
    setHeatmapData(data);
  }, [cocoData, heatmapType, settings, currentImageId, setHeatmapData]);

  const handleCopyToClipboard = async () => {
    if (!heatmapData) {
      return;
    }

    try {
      const csv = exportHeatmapAsCSV(heatmapData, categoryMap);

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(csv);

        // 成功メッセージを表示
        const toast = document.createElement('div');
        toast.textContent = 'ヒートマップデータをクリップボードにコピーしました';
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
    } catch {
      // フォールバック: テキストエリアで選択可能にする
      const csv = exportHeatmapAsCSV(heatmapData, categoryMap);

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
      message.textContent =
        'クリップボードへのコピーが失敗しました。下のテキストを手動でコピーしてください:';
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

  // 複数画像があるかチェック
  const hasMultipleImages = cocoData && cocoData.images && cocoData.images.length > 1;

  if (!cocoData || !cocoData.annotations || cocoData.annotations.length === 0) {
    return (
      <div className="heatmap-empty">
        <p>{t('info.noImageLoaded')}</p>
      </div>
    );
  }

  return (
    <>
      {/* ビューモード選択セクション */}
      {hasMultipleImages && (
        <div className="statistics-section">
          <h3>{t('heatmap.viewMode')}</h3>
          <div className="view-mode-toggle">
            <button
              className={settings.viewMode === 'current' ? 'active' : ''}
              onClick={() => setViewMode('current')}
            >
              {t('heatmap.currentImage')}
            </button>
            <button
              className={settings.viewMode === 'all' ? 'active' : ''}
              onClick={() => setViewMode('all')}
            >
              {t('heatmap.allImages')}
            </button>
          </div>
        </div>
      )}

      {/* コントロール設定セクション */}
      <div className="statistics-section">
        <h3>{t('heatmap.settings')}</h3>
        <div className="heatmap-controls">
          {/* ヒートマップタイプ選択 */}
          <div className="control-group">
            <label>{t('heatmap.heatmapType')}</label>
            <select
              value={heatmapType}
              onChange={(e) => setHeatmapType(e.target.value as HeatmapType)}
              className="select"
            >
              <option value="widthHeight">{t('heatmap.widthHeight')}</option>
              <option value="centerXY">{t('heatmap.centerXY')}</option>
              <option value="areaAspectRatio">{t('heatmap.areaAspectRatio')}</option>
              <option value="polygonAreaAspectRatio">{t('heatmap.polygonAreaAspectRatio')}</option>
            </select>
          </div>

          {/* X軸ビン数設定 */}
          <div className="control-group">
            <label>
              {t('heatmap.xBins')}: {settings.xBins}
            </label>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={settings.xBins}
              onChange={(e) => setXBins(parseInt(e.target.value))}
              className="range-input"
            />
          </div>

          {/* Y軸ビン数設定 */}
          <div className="control-group">
            <label>
              {t('heatmap.yBins')}: {settings.yBins}
            </label>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={settings.yBins}
              onChange={(e) => setYBins(parseInt(e.target.value))}
              className="range-input"
            />
          </div>

          {/* カラースケール設定 */}
          <div className="control-group">
            <label>{t('heatmap.colorScale')}</label>
            <select
              value={settings.colorScale}
              onChange={(e) => setColorScale(e.target.value as HeatmapSettings['colorScale'])}
              className="select"
            >
              <option value="viridis">Viridis</option>
              <option value="plasma">Plasma</option>
              <option value="inferno">Inferno</option>
              <option value="magma">Magma</option>
              <option value="cividis">Cividis</option>
            </select>
          </div>

          {/* クリップボードコピーボタン */}
          <div className="control-group">
            <label>{t('heatmap.copy')}</label>
            <button
              className="btn btn-secondary"
              onClick={handleCopyToClipboard}
              disabled={!heatmapData}
            >
              {t('heatmap.copy')}
            </button>
          </div>
        </div>
      </div>

      {/* カテゴリフィルタセクション */}
      {cocoData.categories && cocoData.categories.length > 0 && (
        <div className="statistics-section">
          <h3>{t('heatmap.categoryFilter')}</h3>
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
              {t('heatmap.allCategories')}
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

      {/* ヒートマップチャート */}
      {heatmapData ? (
        <div className="heatmap-chart-section">
          <HeatmapChart data={heatmapData} colorScale={settings.colorScale} />
        </div>
      ) : (
        <div className="heatmap-empty">
          <p>ヒートマップデータを計算中...</p>
        </div>
      )}

      {/* 統計情報セクション */}
      {heatmapData && (
        <div className="statistics-section">
          <h3>{t('heatmap.statistics')}</h3>
          <div className="statistics-grid">
            <div className="statistic-card">
              <div className="statistic-value">{heatmapData.totalCount.toLocaleString()}</div>
              <div className="statistic-label">{t('heatmap.totalAnnotations')}</div>
            </div>
            <div className="statistic-card">
              <div className="statistic-value">
                {heatmapData.xMin.toFixed(1)} - {heatmapData.xMax.toFixed(1)}
              </div>
              <div className="statistic-label">
                {heatmapData.xLabel} {t('heatmap.range')}
              </div>
            </div>
            <div className="statistic-card">
              <div className="statistic-value">
                {heatmapData.yMin.toFixed(1)} - {heatmapData.yMax.toFixed(1)}
              </div>
              <div className="statistic-label">
                {heatmapData.yLabel} {t('heatmap.range')}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
