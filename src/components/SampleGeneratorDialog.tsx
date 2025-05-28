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
  const [imageCount, setImageCount] = useState(1);
  const [classCount, setClassCount] = useState(4);
  const [annotationCount, setAnnotationCount] = useState(10);
  const [filename, setFilename] = useState('sample');
  const [maxObjectSize, setMaxObjectSize] = useState(80);
  const [allowOverlap, setAllowOverlap] = useState(true);
  const [includeLicenses, setIncludeLicenses] = useState(false);
  const [includeOption, setIncludeOption] = useState(false);
  const [includeMultiPolygon, setIncludeMultiPolygon] = useState(false);
  const [includePairJson, setIncludePairJson] = useState(false);
  const [maxPairMatches, setMaxPairMatches] = useState(1);
  const [perfectMatchRatio, setPerfectMatchRatio] = useState(25);
  const [partialMatchRatio, setPartialMatchRatio] = useState(35);
  const [noMatchRatio, setNoMatchRatio] = useState(20);
  const [additionalRatio, setAdditionalRatio] = useState(20);
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper function to adjust ratios to ensure they always sum to 100
  const adjustRatios = (
    changedRatio: 'perfect' | 'partial' | 'noMatch' | 'additional',
    newValue: number
  ) => {
    const ratios = {
      perfect: perfectMatchRatio,
      partial: partialMatchRatio,
      noMatch: noMatchRatio,
      additional: additionalRatio,
    };

    // Update the changed ratio
    ratios[changedRatio] = newValue;

    // Calculate the sum of other ratios
    const otherRatiosSum = Object.entries(ratios)
      .filter(([key]) => key !== changedRatio)
      .reduce((sum, [, value]) => sum + value, 0);

    // If total would exceed 100, proportionally reduce other ratios
    if (newValue + otherRatiosSum > 100) {
      const excess = newValue + otherRatiosSum - 100;
      const scaleFactor = otherRatiosSum > 0 ? (otherRatiosSum - excess) / otherRatiosSum : 0;

      Object.keys(ratios).forEach((key) => {
        if (key !== changedRatio) {
          ratios[key as keyof typeof ratios] = Math.max(
            0,
            Math.round(ratios[key as keyof typeof ratios] * scaleFactor)
          );
        }
      });
    }

    // Ensure total is exactly 100
    const total = Object.values(ratios).reduce((sum, val) => sum + val, 0);
    if (total < 100) {
      // Add the difference to the first non-zero ratio that isn't the changed one
      const diff = 100 - total;
      const keysToAdjust = Object.keys(ratios).filter(
        (key) => key !== changedRatio && ratios[key as keyof typeof ratios] > 0
      );
      if (keysToAdjust.length > 0) {
        ratios[keysToAdjust[0] as keyof typeof ratios] += diff;
      } else {
        // If all others are 0, set the changed ratio to 100
        ratios[changedRatio] = 100;
      }
    }

    // Update all states
    setPerfectMatchRatio(ratios.perfect);
    setPartialMatchRatio(ratios.partial);
    setNoMatchRatio(ratios.noMatch);
    setAdditionalRatio(ratios.additional);
  };

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
          image_count: imageCount,
          class_count: classCount,
          annotation_count: annotationCount,
          filename,
          max_object_size: maxObjectSize,
          allow_overlap: allowOverlap,
          include_licenses: includeLicenses,
          include_option: includeOption,
          include_multi_polygon: includeMultiPolygon,
          include_pair_json: includePairJson,
          max_pair_matches: includePairJson ? maxPairMatches : undefined,
          pair_perfect_match_ratio: includePairJson ? perfectMatchRatio / 100 : undefined,
          pair_partial_match_ratio: includePairJson ? partialMatchRatio / 100 : undefined,
          pair_no_match_ratio: includePairJson ? noMatchRatio / 100 : undefined,
          pair_additional_ratio: includePairJson ? additionalRatio / 100 : undefined,
        },
      });

      alert(t('success.sampleGenerated'));

      // Automatically load the generated files
      // For multiple images, load the first one
      const imagePath =
        imageCount === 1
          ? `${outputDir}/${filename}-image.png`
          : `${outputDir}/${filename}-image-1.png`;
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
            <label htmlFor="imageCount">{t('sampleGenerator.imageCount')}</label>
            <input
              id="imageCount"
              type="number"
              className="input"
              value={imageCount}
              onChange={(e) =>
                setImageCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))
              }
              min="1"
              max="10"
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

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeMultiPolygon}
                onChange={(e) => setIncludeMultiPolygon(e.target.checked)}
              />
              {t('sampleGenerator.includeMultiPolygon')}
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includePairJson}
                onChange={(e) => setIncludePairJson(e.target.checked)}
              />
              {t('sampleGenerator.includePairJson')}
            </label>
            {includePairJson && (
              <>
                <div className="form-group sub-option">
                  <label>
                    {t('sampleGenerator.maxPairMatches')}: {maxPairMatches}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={maxPairMatches}
                    onChange={(e) => setMaxPairMatches(parseInt(e.target.value))}
                  />
                  <div className="setting-description">
                    {t('sampleGenerator.maxPairMatchesDescription')}
                  </div>
                </div>

                <div className="form-group sub-option">
                  <h4>{t('sampleGenerator.distributionSettings')}</h4>
                  <div className="setting-description">
                    {t('sampleGenerator.distributionDescription')}
                  </div>

                  <div className="distribution-control">
                    <label>
                      {t('sampleGenerator.perfectMatch')}: {perfectMatchRatio}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={perfectMatchRatio}
                      onChange={(e) => adjustRatios('perfect', parseInt(e.target.value))}
                    />
                  </div>

                  <div className="distribution-control">
                    <label>
                      {t('sampleGenerator.partialMatch')}: {partialMatchRatio}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={partialMatchRatio}
                      onChange={(e) => adjustRatios('partial', parseInt(e.target.value))}
                    />
                  </div>

                  <div className="distribution-control">
                    <label>
                      {t('sampleGenerator.noMatch')}: {noMatchRatio}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={noMatchRatio}
                      onChange={(e) => adjustRatios('noMatch', parseInt(e.target.value))}
                    />
                  </div>

                  <div className="distribution-control">
                    <label>
                      {t('sampleGenerator.additional')}: {additionalRatio}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={additionalRatio}
                      onChange={(e) => adjustRatios('additional', parseInt(e.target.value))}
                    />
                  </div>

                  <div className="distribution-total">
                    {t('sampleGenerator.total')}:{' '}
                    {perfectMatchRatio + partialMatchRatio + noMatchRatio + additionalRatio}%
                  </div>
                </div>
              </>
            )}
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
              {includePairJson && (
                <li>{t('sampleGenerator.pairJsonOutput', { name: filename })}</li>
              )}
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
