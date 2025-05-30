/* eslint-disable react/prop-types */
import React from 'react';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { HeatmapData } from '../../stores/useHeatmapStore';
import './HeatmapChart.css';

interface HeatmapChartProps {
  data: HeatmapData;
  colorScale: 'viridis' | 'plasma' | 'inferno' | 'magma' | 'cividis';
}

// カラースケールの定義（maxValueは後で設定）
const getColorScheme = (
  scheme: 'greens' | 'purples' | 'oranges' | 'reds' | 'blues',
  maxValue: number
) => ({
  type: 'sequential' as const,
  scheme: scheme,
  minValue: 0,
  maxValue: maxValue,
});

export const HeatmapChart: React.FC<HeatmapChartProps> = ({ data, colorScale }) => {
  // Nivoフォーマットに変換
  const nivoData = React.useMemo(() => {
    const result: Array<{
      id: string;
      data: Array<{
        x: string;
        y: number;
      }>;
    }> = [];

    // Y軸の値を生成（逆順にして上が大きい値になるように）
    const yLabels: string[] = [];
    for (let j = data.bins[0].length - 1; j >= 0; j--) {
      const yMin = data.yMin + (j * (data.yMax - data.yMin)) / data.bins[0].length;
      const yMax = data.yMin + ((j + 1) * (data.yMax - data.yMin)) / data.bins[0].length;
      yLabels.push(`${yMin.toFixed(1)}-${yMax.toFixed(1)}`);
    }

    // X軸ごとにデータを作成
    for (let i = 0; i < data.bins.length; i++) {
      const xMin = data.xMin + (i * (data.xMax - data.xMin)) / data.bins.length;
      const xMax = data.xMin + ((i + 1) * (data.xMax - data.xMin)) / data.bins.length;
      const xLabel = `${xMin.toFixed(1)}-${xMax.toFixed(1)}`;

      const row = {
        id: xLabel,
        data: data.bins[i].map((bin, j) => ({
          x: yLabels[data.bins[0].length - 1 - j],
          y: bin.count,
        })),
      };

      result.push(row);
    }

    return result;
  }, [data]);

  const maxValue = Math.max(...data.bins.flat().map((bin) => bin.count));

  return (
    <div className="heatmap-container">
      <div className="heatmap-wrapper">
        <h4 className="heatmap-title">
          {data.xLabel} × {data.yLabel}
        </h4>

        <div className="nivo-heatmap-container">
          <ResponsiveHeatMap
            data={nivoData}
            margin={{ top: 60, right: 90, bottom: 100, left: 90 }}
            valueFormat=">-.0f"
            axisTop={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: -45,
              legend: data.yLabel,
              legendPosition: 'middle',
              legendOffset: -50,
            }}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: -45,
              legend: data.xLabel,
              legendPosition: 'middle',
              legendOffset: 80,
              format: (value) => {
                // ラベルが長い場合は省略
                if (value.length > 10) {
                  return value.substring(0, 10) + '...';
                }
                return value;
              },
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: '',
              legendPosition: 'middle',
              legendOffset: -72,
              format: (value) => {
                // ラベルが長い場合は省略
                if (value.length > 10) {
                  return value.substring(0, 10) + '...';
                }
                return value;
              },
            }}
            colors={getColorScheme(
              colorScale === 'viridis'
                ? 'greens'
                : colorScale === 'plasma'
                  ? 'purples'
                  : colorScale === 'inferno'
                    ? 'oranges'
                    : colorScale === 'magma'
                      ? 'reds'
                      : 'blues',
              maxValue
            )}
            emptyColor="#ffffff"
            borderColor={{
              from: 'color',
              modifiers: [['darker', 0.3]],
            }}
            labelTextColor={{
              from: 'color',
              modifiers: [['darker', 1.8]],
            }}
            animate={true}
            motionConfig="gentle"
            hoverTarget="cell"
            tooltip={(props) => {
              const cell = props.cell;
              return (
                <div
                  style={{
                    background: 'white',
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  <div style={{ color: '#666', fontSize: '12px' }}>
                    {data.xLabel}: {cell.serieId}
                  </div>
                  <div style={{ color: '#666', fontSize: '12px' }}>
                    {data.yLabel}: {cell.data.x}
                  </div>
                  <div
                    style={{
                      marginTop: '4px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        background: cell.color,
                        borderRadius: '2px',
                      }}
                    />
                    Count: {cell.value}
                  </div>
                </div>
              );
            }}
            legends={[
              {
                anchor: 'right',
                translateX: 30,
                translateY: 0,
                length: 200,
                thickness: 10,
                direction: 'column',
                tickPosition: 'after',
                tickSize: 3,
                tickSpacing: 4,
                tickOverlap: false,
                title: 'Count →',
                titleAlign: 'start',
                titleOffset: 4,
              },
            ]}
          />
        </div>

        <div className="heatmap-stats">
          <span>Total: {data.totalCount}</span>
          <span>Max: {maxValue}</span>
          <span>
            Bins: {data.bins.length} × {data.bins[0]?.length || 0}
          </span>
        </div>
      </div>
    </div>
  );
};
