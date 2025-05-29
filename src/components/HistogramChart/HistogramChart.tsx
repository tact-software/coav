import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  TooltipProps,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { HistogramData, HistogramType } from '../../stores/useHistogramStore';
import { COCOCategory } from '../../types/coco';
import './HistogramChart.css';

interface HistogramChartProps {
  data: HistogramData;
  categories: COCOCategory[];
  onBinClick?: (binIndex: number) => void;
  onBinHover?: (binIndex: number | null) => void;
  highlightedBinIndex?: number | null;
}

interface ChartDataPoint {
  binIndex: number;
  range: string;
  count: number;
  percentage: number;
  categoryBreakdown: Array<{ categoryId: number; count: number }>;
}

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload }) => {
  const { t } = useTranslation();
  
  if (!active || !payload || !payload[0]) {
    return null;
  }

  const data = payload[0].payload as ChartDataPoint;

  return (
    <div className="histogram-tooltip">
      <div className="tooltip-header">
        <strong>{data.range}</strong>
      </div>
      <div className="tooltip-content">
        <div>{t('histogram.count')}: {data.count}</div>
        <div>{t('histogram.percentage')}: {data.percentage.toFixed(1)}%</div>
      </div>
    </div>
  );
};

export const HistogramChart: React.FC<HistogramChartProps> = ({
  data,
  onBinClick,
  onBinHover,
  highlightedBinIndex,
}) => {
  const { t } = useTranslation();

  // チャートデータを準備
  const chartData = useMemo(() => {
    return data.bins.map((bin, index) => {
      const rangeStr = formatRange(bin.range, data.type);
      const percentage = (bin.count / data.statistics.total) * 100;

      return {
        binIndex: index,
        range: rangeStr,
        count: bin.count,
        percentage,
        categoryBreakdown: Array.from(bin.categoryBreakdown.entries()).map(([categoryId, count]) => ({
          categoryId,
          count,
        })),
      };
    });
  }, [data]);

  // Y軸のラベルフォーマット
  const formatYAxis = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toString();
  };

  // X軸のラベルフォーマット
  const formatXAxisTick = (value: string, index: number) => {
    // ビンが多い場合は一部のラベルのみ表示
    if (data.bins.length > 20 && index % 2 !== 0) {
      return '';
    }
    return value;
  };

  // バーの色を決定
  const getBarColor = (index: number) => {
    if (highlightedBinIndex === index) {
      return 'var(--color-brand-primary-dark)';
    }
    return 'var(--color-brand-primary)';
  };

  return (
    <div className="histogram-chart">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 40, bottom: 60 }}
          onMouseLeave={() => onBinHover?.(null)}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-primary)" />
          <XAxis
            dataKey="range"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
            tickFormatter={formatXAxisTick}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'var(--color-brand-primary)', opacity: 0.1 }}
          />
          <Bar
            dataKey="count"
            onClick={(data: ChartDataPoint) => onBinClick?.(data.binIndex)}
            onMouseEnter={(data: ChartDataPoint) => onBinHover?.(data.binIndex)}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

    </div>
  );
};

// 範囲のフォーマット
function formatRange(range: [number, number], type: HistogramType): string {
  const [start, end] = range;
  
  if (type === 'aspectRatio') {
    return `${start.toFixed(2)}-${end.toFixed(2)}`;
  }
  
  if (end >= 1000) {
    return `${Math.round(start)}-${Math.round(end)}`;
  }
  
  return `${Math.round(start)}-${Math.round(end)}`;
}

// 値のフォーマット
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