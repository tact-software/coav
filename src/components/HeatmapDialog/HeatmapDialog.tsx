import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHeatmapStore } from '../../stores/useHeatmapStore';
import { CommonModal } from '../CommonModal';
import { HeatmapPanel } from '../HeatmapPanel';

export const HeatmapDialog: React.FC = () => {
  const { t } = useTranslation();
  const { isOpen, closeModal } = useHeatmapStore();

  return (
    <CommonModal
      isOpen={isOpen}
      onClose={closeModal}
      title={t('heatmap.title')}
      size="xl"
      hasBlur={true}
    >
      <HeatmapPanel />
    </CommonModal>
  );
};
