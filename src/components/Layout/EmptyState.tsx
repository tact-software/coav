import { useTranslation } from 'react-i18next';

interface EmptyStateProps {
  onOpenImage: () => void;
  onOpenAnnotations: () => void;
}

export function EmptyState({ onOpenImage, onOpenAnnotations }: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className="empty-state">
      <div className="empty-state-content">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <h3>{t('empty.noImageLoaded')}</h3>
        <p>{t('empty.openImagePrompt')}</p>
        <div className="empty-state-actions">
          <button className="btn btn-primary" onClick={onOpenImage}>
            {t('empty.openImage')}
          </button>
          <button className="btn btn-secondary" onClick={onOpenAnnotations}>
            {t('empty.openAnnotations')}
          </button>
        </div>
      </div>
    </div>
  );
}
