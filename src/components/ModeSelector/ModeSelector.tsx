import { useTranslation } from 'react-i18next';
import { useModeStore, useAnnotationStore } from '../../stores';
import type { AppMode } from '../../types';
import './ModeSelector.css';

interface ModeSelectorProps {
  className?: string;
}

export function ModeSelector({ className = '' }: ModeSelectorProps) {
  const { t } = useTranslation();
  const mode = useModeStore((state) => state.mode);
  const setMode = useModeStore((state) => state.setMode);
  const cocoData = useAnnotationStore((state) => state.cocoData);

  // アノテーションモードは画像とアノテーションデータが読み込まれている場合に有効
  const canEnterAnnotationMode = cocoData !== null;

  const modes: { key: AppMode; label: string; disabled: boolean }[] = [
    {
      key: 'normal',
      label: t('mode.normal'),
      disabled: false,
    },
    {
      key: 'comparison',
      label: t('mode.comparison'),
      disabled: mode === 'annotation',
    },
    {
      key: 'annotation',
      label: t('mode.annotation'),
      disabled: !canEnterAnnotationMode,
    },
  ];

  const handleModeChange = (newMode: AppMode) => {
    if (newMode === mode) return;

    // 比較モードへの切り替えはアノテーションモード中は不可
    if (newMode === 'comparison' && mode === 'annotation') {
      return;
    }

    // アノテーションモードへの切り替えは画像データが必要
    if (newMode === 'annotation' && !canEnterAnnotationMode) {
      return;
    }

    setMode(newMode);
  };

  return (
    <div className={`mode-selector ${className}`}>
      {modes.map(({ key, label, disabled }) => (
        <button
          key={key}
          className={`mode-selector__button ${mode === key ? 'mode-selector__button--active' : ''} ${disabled ? 'mode-selector__button--disabled' : ''}`}
          onClick={() => handleModeChange(key)}
          disabled={disabled}
          title={disabled && key === 'annotation' ? t('mode.annotationDisabledHint') : undefined}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
