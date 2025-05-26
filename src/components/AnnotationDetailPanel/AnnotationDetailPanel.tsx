import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnnotationStore, useSettingsStore } from '../../stores';
import { getValueByPath, hasFieldPath } from '../../utils';
import { COCOAnnotation } from '../../types/coco';
import './AnnotationDetailPanel.css';

type ViewMode = 'formatted' | 'json';

const AnnotationDetailPanel: React.FC = () => {
  const { t } = useTranslation();
  const { selectedAnnotationIds, cocoData, getCategoryById } = useAnnotationStore();
  const { detail } = useSettingsStore();

  const [viewMode, setViewMode] = useState<ViewMode>('formatted');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Get selected annotations
  const selectedAnnotations =
    cocoData?.annotations.filter((ann) => selectedAnnotationIds.includes(ann.id)) || [];

  // Toggle section collapse
  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Copy entire JSON
  const copyJSON = () => {
    if (selectedAnnotations.length === 1) {
      copyToClipboard(JSON.stringify(selectedAnnotations[0], null, 2));
    } else {
      copyToClipboard(JSON.stringify(selectedAnnotations, null, 2));
    }
  };

  // Render field
  const renderField = (
    label: string,
    value: string | number | boolean | object,
    copyable = true
  ) => {
    const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

    return (
      <div className="detail-field">
        <span className="detail-field-label">{label}:</span>
        <span className="detail-field-value">{displayValue}</span>
        {copyable && (
          <button
            className="detail-field-copy"
            onClick={() => copyToClipboard(displayValue)}
            title={t('common.copyToClipboard')}
          >
            📋
          </button>
        )}
      </div>
    );
  };

  // Render JSON field with formatting
  const renderJSONField = (label: string, value: object) => {
    const jsonString = JSON.stringify(value, null, 2);

    return (
      <div className="detail-field detail-field-json">
        <div className="detail-field-header">
          <span className="detail-field-label">{label}:</span>
          <button
            className="detail-field-copy"
            onClick={() => copyToClipboard(jsonString)}
            title={t('common.copyToClipboard')}
          >
            📋
          </button>
        </div>
        <pre className="detail-field-json-content">{jsonString}</pre>
      </div>
    );
  };

  // Render segmentation info
  const renderSegmentation = (segmentation: number[][]) => {
    const totalPoints = segmentation.reduce((sum, poly) => sum + poly.length / 2, 0);
    const polygons = segmentation.length;

    return (
      <div>
        <div className="segmentation-summary">
          {t('detail.polygons')}: {polygons}, {t('detail.points')}: {totalPoints}
        </div>
        <div className="segmentation-points">
          {segmentation.map((poly, i) => (
            <div key={i}>
              <strong>
                {t('detail.polygon')} {i + 1} ({poly.length / 2} {t('detail.points').toLowerCase()}
                ):
              </strong>
              <pre>{JSON.stringify(poly, null, 2)}</pre>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render promoted field section
  const renderPromotedField = (fieldPath: string, annotation: COCOAnnotation) => {
    if (!hasFieldPath(annotation, fieldPath)) {
      return null;
    }

    const value = getValueByPath(annotation, fieldPath);
    const displayName =
      fieldPath
        .split('.')
        .pop()
        ?.replace(/[_-]/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ') || fieldPath;

    const sectionKey = `promoted-${fieldPath}`;

    return (
      <div key={fieldPath} className="detail-section">
        <div
          className={`detail-section-header ${collapsedSections.has(sectionKey) ? 'collapsed' : ''}`}
          onClick={() => toggleSection(sectionKey)}
        >
          <span className="detail-section-toggle">▼</span>
          <h3 className="detail-section-title">{displayName}</h3>
        </div>
        <div className="detail-section-content">
          {typeof value === 'object' && value !== null
            ? renderJSONField(displayName, value)
            : renderField(displayName, value as string | number | boolean)}
        </div>
      </div>
    );
  };

  // Render single annotation details
  const renderAnnotationDetails = (annotation: COCOAnnotation) => {
    const category = getCategoryById(annotation.category_id);
    const image = cocoData?.images.find((img) => img.id === annotation.image_id);

    return (
      <div>
        {/* Basic Information */}
        <div className="detail-section">
          <div
            className={`detail-section-header ${collapsedSections.has('basic') ? 'collapsed' : ''}`}
            onClick={() => toggleSection('basic')}
          >
            <span className="detail-section-toggle">▼</span>
            <h3 className="detail-section-title">{t('detail.basicInfo')}</h3>
          </div>
          <div className="detail-section-content">
            {renderField(t('common.id'), annotation.id)}
            {renderField(t('detail.categoryId'), annotation.category_id)}
            {category && renderField(t('detail.categoryName'), category.name)}
            {renderField(t('info.imageId'), annotation.image_id)}
            {image && renderField(t('detail.imageFile'), image.file_name)}
            {renderField(
              t('detail.isCrowd'),
              annotation.iscrowd === 1 ? t('common.yes') : t('common.no')
            )}
          </div>
        </div>

        {/* Spatial Information */}
        <div className="detail-section">
          <div
            className={`detail-section-header ${collapsedSections.has('spatial') ? 'collapsed' : ''}`}
            onClick={() => toggleSection('spatial')}
          >
            <span className="detail-section-toggle">▼</span>
            <h3 className="detail-section-title">{t('detail.spatialInfo')}</h3>
          </div>
          <div className="detail-section-content">
            {renderField(t('detail.area'), annotation.area.toFixed(2))}
            {renderField(
              t('detail.boundingBox'),
              `[${annotation.bbox.map((v) => v.toFixed(1)).join(', ')}]`
            )}
            {renderField('X', annotation.bbox[0].toFixed(1))}
            {renderField('Y', annotation.bbox[1].toFixed(1))}
            {renderField(t('detail.width'), annotation.bbox[2].toFixed(1))}
            {renderField(t('detail.height'), annotation.bbox[3].toFixed(1))}
          </div>
        </div>

        {/* Segmentation */}
        {annotation.segmentation && (
          <div className="detail-section">
            <div
              className={`detail-section-header ${collapsedSections.has('segmentation') ? 'collapsed' : ''}`}
              onClick={() => toggleSection('segmentation')}
            >
              <span className="detail-section-toggle">▼</span>
              <h3 className="detail-section-title">{t('detail.segmentation')}</h3>
            </div>
            <div className="detail-section-content">
              {renderSegmentation(annotation.segmentation)}
            </div>
          </div>
        )}

        {/* Promoted Fields */}
        {detail.promotedFields.map((fieldPath) => renderPromotedField(fieldPath, annotation))}
      </div>
    );
  };

  // Render content based on selection
  const renderContent = () => {
    if (selectedAnnotations.length === 0) {
      return (
        <div className="detail-empty-state">
          <p>{t('detail.noSelection')}</p>
          <p>{t('detail.clickToView')}</p>
        </div>
      );
    }

    if (viewMode === 'json') {
      return (
        <div className="detail-json-view">
          <pre>
            {selectedAnnotations.length === 1
              ? JSON.stringify(selectedAnnotations[0], null, 2)
              : JSON.stringify(selectedAnnotations, null, 2)}
          </pre>
        </div>
      );
    }

    if (selectedAnnotations.length === 1) {
      return renderAnnotationDetails(selectedAnnotations[0]);
    }

    // Multiple selection
    return (
      <div>
        <div className="detail-multi-select-info">
          {t('detail.multipleSelected', { count: selectedAnnotations.length })}
        </div>
        {selectedAnnotations.map((ann) => (
          <div key={ann.id} style={{ marginBottom: '2rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>
              {t('detail.annotation')} #{ann.id}
            </h4>
            {renderAnnotationDetails(ann)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="annotation-detail-panel">
      {selectedAnnotations.length > 0 && (
        <>
          <div className="detail-view-toggle">
            <button
              className={viewMode === 'formatted' ? 'active' : ''}
              onClick={() => setViewMode('formatted')}
            >
              {t('detail.formatted')}
            </button>
            <button
              className={viewMode === 'json' ? 'active' : ''}
              onClick={() => setViewMode('json')}
            >
              {t('detail.json')}
            </button>
          </div>

          {viewMode === 'json' && (
            <button
              style={{
                width: '100%',
                marginBottom: '1rem',
                padding: '0.5rem',
                background: 'var(--color-brand-primary)',
                color: 'var(--color-text-inverse)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
              onClick={copyJSON}
            >
              {t('detail.copyJson')}
            </button>
          )}
        </>
      )}

      {renderContent()}
    </div>
  );
};

export default AnnotationDetailPanel;
