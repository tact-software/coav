import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { dirname } from '@tauri-apps/api/path';
import { useTranslation } from 'react-i18next';
import './SampleGeneratorDialog.css';

interface SampleGeneratorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (imagePath: string, jsonPath: string) => void;
}

const SampleGeneratorDialog: React.FC<SampleGeneratorDialogProps> = ({
  isOpen,
  onClose,
  onGenerated,
}) => {
  const { t } = useTranslation();
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [classCount, setClassCount] = useState(4);
  const [annotationCount, setAnnotationCount] = useState(10);
  const [filename, setFilename] = useState('sample');
  const [maxObjectSize, setMaxObjectSize] = useState(80);
  const [allowOverlap, setAllowOverlap] = useState(true);
  const [includeLicenses, setIncludeLicenses] = useState(false);
  const [includeOption, setIncludeOption] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);

      // Select output file (we'll use its directory)
      const outputPath = await save({
        title: t('sampleGenerator.title'),
        defaultPath: `${filename}-annotation.json`,
        filters: [
          {
            name: 'JSON',
            extensions: ['json'],
          },
        ],
      });

      if (!outputPath) {
        setIsGenerating(false);
        return;
      }

      // Get directory from the file path
      const outputDir = await dirname(outputPath);

      // Generate sample data
      await invoke<string>('generate_sample_data', {
        params: {
          width,
          height,
          output_dir: outputDir,
          class_count: classCount,
          annotation_count: annotationCount,
          filename,
          max_object_size: maxObjectSize,
          allow_overlap: allowOverlap,
          include_licenses: includeLicenses,
          include_option: includeOption,
        },
      });

      alert(t('success.sampleGenerated'));

      // Automatically load the generated files
      const imagePath = `${outputDir}/${filename}-image.png`;
      const jsonPath = `${outputDir}/${filename}-annotation.json`;
      onGenerated(imagePath, jsonPath);
      onClose();
    } catch (error) {
      console.error('Error generating sample data:', error);
      alert(`${t('sampleGenerator.generationFailed')}: ${error}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>{t('sampleGenerator.title')}</h2>
          <button className="dialog-close" onClick={onClose}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="dialog-body">
          <p className="dialog-description">{t('sampleGenerator.description')}</p>

          <div className="form-group">
            <label htmlFor="filename">{t('sampleGenerator.fileNameLabel')}</label>
            <input
              id="filename"
              type="text"
              className="input"
              value={filename}
              onChange={(e) => setFilename(e.target.value || 'sample')}
              placeholder={t('sampleGenerator.fileNamePlaceholder')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="width">{t('sampleGenerator.imageWidth')}</label>
            <input
              id="width"
              type="number"
              className="input"
              value={width}
              onChange={(e) => setWidth(parseInt(e.target.value) || 800)}
              min="100"
              max="4000"
            />
          </div>

          <div className="form-group">
            <label htmlFor="height">{t('sampleGenerator.imageHeight')}</label>
            <input
              id="height"
              type="number"
              className="input"
              value={height}
              onChange={(e) => setHeight(parseInt(e.target.value) || 600)}
              min="100"
              max="4000"
            />
          </div>

          <div className="form-group">
            <label htmlFor="classCount">{t('sampleGenerator.numClassesMax')}</label>
            <input
              id="classCount"
              type="number"
              className="input"
              value={classCount}
              onChange={(e) =>
                setClassCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 4)))
              }
              min="1"
              max="10"
            />
          </div>

          <div className="form-group">
            <label htmlFor="annotationCount">{t('sampleGenerator.numAnnotations')}</label>
            <input
              id="annotationCount"
              type="number"
              className="input"
              value={annotationCount}
              onChange={(e) => setAnnotationCount(Math.max(1, parseInt(e.target.value) || 10))}
              min="1"
              max="10000"
            />
          </div>

          <div className="form-group">
            <label htmlFor="maxObjectSize">{t('sampleGenerator.maxObjectSize')}</label>
            <input
              id="maxObjectSize"
              type="number"
              className="input"
              value={maxObjectSize}
              onChange={(e) => setMaxObjectSize(Math.max(20, parseInt(e.target.value) || 80))}
              min="20"
              max={Math.min(width, height) / 2}
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={allowOverlap}
                onChange={(e) => setAllowOverlap(e.target.checked)}
              />
              {t('sampleGenerator.allowOverlap')}
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeLicenses}
                onChange={(e) => setIncludeLicenses(e.target.checked)}
              />
              {t('sampleGenerator.includeLicenses')}
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeOption}
                onChange={(e) => setIncludeOption(e.target.checked)}
              />
              {t('sampleGenerator.includeOption')}
            </label>
          </div>

          <div className="sample-info">
            <h4>{t('sampleGenerator.sampleInclude')}</h4>
            <ul>
              <li>{t('sampleGenerator.randomShapes', { count: annotationCount })}</li>
              <li>
                {annotationCount === 1
                  ? t('sampleGenerator.differentCategory', { count: classCount })
                  : t('sampleGenerator.differentCategories', { count: classCount })}
              </li>
              <li>{t('sampleGenerator.objectsWithAspectRatio', { size: maxObjectSize })}</li>
              <li>{t('sampleGenerator.availableShapes')}</li>
              <li>{t('sampleGenerator.outputFiles', { name: filename })}</li>
            </ul>
          </div>
        </div>

        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isGenerating}>
            {t('sampleGenerator.cancel')}
          </button>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? t('sampleGenerator.generating') : t('sampleGenerator.generate')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SampleGeneratorDialog;
