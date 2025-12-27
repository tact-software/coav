import { useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useTranslation } from 'react-i18next';
import {
  useAnnotationStore,
  useImageStore,
  useRecentFilesStore,
  useNavigationStore,
  toast,
} from '../stores';
import type { RecentFile } from '../stores';
import type { COCOData } from '../types/coco';

interface TempCocoData {
  data: COCOData;
  annotationDir: string;
}

export function useFileOperations() {
  const { t } = useTranslation();
  const { setCocoData, clearCocoData, setCurrentImageId, isComparing, clearComparison } =
    useAnnotationStore();
  const { setImagePath, setImageData, setLoading, setError } = useImageStore();
  const { addRecentFile } = useRecentFilesStore();
  const { navigationMode } = useNavigationStore();

  const [showSampleGenerator, setShowSampleGenerator] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showImageSelection, setShowImageSelection] = useState(false);
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [showHistogramDialog, setShowHistogramDialog] = useState(false);
  const [tempCocoData, setTempCocoData] = useState<TempCocoData | null>(null);

  // Check if images are available
  const { imageData } = useImageStore.getState();
  const { selectedFolderPath } = useNavigationStore.getState();
  const hasImagesAvailable =
    imageData || (navigationMode === 'folder' && selectedFolderPath !== null);

  const handleOpenImage = useCallback(async () => {
    try {
      setLoading(true);

      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Image',
            extensions: ['jpg', 'jpeg', 'png'],
          },
        ],
      });

      if (!selected) {
        setLoading(false);
        return;
      }

      const imagePath = selected as string;
      const { resetToSingleMode } = useNavigationStore.getState();

      setTimeout(() => {
        clearCocoData();
        resetToSingleMode();
      }, 0);

      const imageBytes = await invoke<number[]>('load_image', { filePath: imagePath });
      const uint8Array = new Uint8Array(imageBytes);
      const blob = new Blob([uint8Array]);
      const dataUrl = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        setImagePath(imagePath);
        setImageData(dataUrl, { width: img.width, height: img.height });
        addRecentFile({
          path: imagePath,
          name: imagePath.split('/').pop() || 'Unknown',
          type: 'image',
        });
        toast.success(
          t('success.imageLoaded'),
          `${t('success.loaded')}: ${imagePath.split('/').pop()}`
        );
      };
      img.onerror = () => {
        setError('Failed to load image');
        toast.error(t('errors.loadImageFailed'), t('errors.invalidImageFormat'));
      };
      img.src = dataUrl;
    } catch (error) {
      console.error('Error loading image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to open image';
      setError(errorMessage);
      toast.error(t('errors.loadImageFailed'), errorMessage);
    }
  }, [setImagePath, setImageData, setLoading, setError, clearCocoData, addRecentFile, t]);

  const handleOpenAnnotations = useCallback(async () => {
    const { imageData } = useImageStore.getState();
    const { selectedFolderPath, navigationMode } = useNavigationStore.getState();
    const hasImages = imageData || (navigationMode === 'folder' && selectedFolderPath !== null);

    if (!hasImages) {
      toast.error(t('errors.loadAnnotationFailed'), t('errors.imageRequiredFirst'));
      return;
    }

    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'JSON',
            extensions: ['json'],
          },
        ],
      });

      if (!selected) return;

      const jsonPath = selected as string;
      setShowImageSelection(false);
      setTempCocoData(null);

      const data = await invoke<COCOData>('load_annotations', { filePath: jsonPath });
      const annotationDir =
        jsonPath.substring(0, jsonPath.lastIndexOf('/')) ||
        jsonPath.substring(0, jsonPath.lastIndexOf('\\'));

      if (data.images && data.images.length > 1) {
        if (navigationMode === 'folder') {
          setCocoData(data);
          setCurrentImageId(data.images[0].id);
        } else {
          setTempCocoData({ data, annotationDir });
        }
      } else if (data.images && data.images.length === 1) {
        setCocoData(data);
        setCurrentImageId(data.images[0].id);
      } else {
        setCocoData(data);
      }

      addRecentFile({
        path: jsonPath,
        name: jsonPath.split('/').pop() || jsonPath.split('\\').pop() || 'Unknown',
        type: 'annotation',
      });
      toast.success(
        t('success.annotationsLoaded'),
        `${t('success.loaded')} ${data.annotations.length} ${t('controls.annotations').toLowerCase()}`
      );
    } catch (error) {
      console.error('Error loading annotations:', error);
      let errorMessage = 'Failed to load annotations';
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = error.message as string;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      setError(errorMessage);
      toast.error(t('errors.loadAnnotationsFailed'), errorMessage);
    }
  }, [setCocoData, setCurrentImageId, setError, addRecentFile, t]);

  const handleOpenFolder = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: t('navigation.selectFolder'),
      });

      if (!selected) return;

      try {
        clearCocoData();
        const { setSelectedFolderPath, clearImageList } = useNavigationStore.getState();

        setTimeout(() => {
          const { clearImage } = useImageStore.getState();
          clearImage();
          clearImageList();
          setSelectedFolderPath(selected as string);
        }, 0);

        toast.success(
          'フォルダを選択しました',
          'アノテーションを読み込むとナビゲーション機能が利用可能になります'
        );
      } catch (stateError) {
        console.error('Error updating state after folder selection:', stateError);
        toast.error(
          'フォルダの設定中にエラーが発生しました',
          stateError instanceof Error ? stateError.message : 'Unknown error'
        );
      }
    } catch (error) {
      console.error('Failed to open folder dialog:', error);
      toast.error(
        'フォルダ選択ダイアログの表示に失敗しました',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }, [t, clearCocoData]);

  const handleExportAnnotations = useCallback(() => {
    const { cocoData } = useAnnotationStore.getState();
    if (!cocoData) return;

    const dataStr = JSON.stringify(cocoData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'annotations.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(t('success.annotationsExported'), t('success.exported'));
  }, [t]);

  const handleGenerateSample = useCallback(() => {
    setShowSampleGenerator(true);
  }, []);

  const handleShowStatistics = useCallback(() => {
    setShowStatistics(true);
  }, []);

  const handleSampleGenerated = useCallback(
    async (imagePath: string, jsonPath: string) => {
      try {
        setLoading(true);
        const imageBytes = await invoke<number[]>('load_image', { filePath: imagePath });
        const uint8Array = new Uint8Array(imageBytes);
        const blob = new Blob([uint8Array]);
        const dataUrl = URL.createObjectURL(blob);

        const img = new Image();
        img.onload = () => {
          setImagePath(imagePath);
          setImageData(dataUrl, { width: img.width, height: img.height });
        };
        img.src = dataUrl;

        const data = await invoke<COCOData>('load_annotations', { filePath: jsonPath });
        setCocoData(data);
        toast.success(
          t('success.sampleGenerated'),
          `${t('success.generated')} ${data.annotations.length} ${t('controls.annotations').toLowerCase()}`
        );
      } catch (error) {
        console.error('Error loading generated files:', error);
        setError('Failed to load generated files');
        toast.error(t('sampleGenerator.generationFailed'), t('errors.error'));
      }
    },
    [setImagePath, setImageData, setLoading, setError, setCocoData, t]
  );

  const loadImageFromPath = useCallback(
    async (imagePath: string) => {
      try {
        setLoading(true);
        setShowImageSelection(false);
        setTempCocoData(null);

        const { resetToSingleMode } = useNavigationStore.getState();

        setTimeout(() => {
          clearCocoData();
          resetToSingleMode();
        }, 0);

        const imageBytes = await invoke<number[]>('load_image', { filePath: imagePath });
        const uint8Array = new Uint8Array(imageBytes);
        const blob = new Blob([uint8Array]);
        const dataUrl = URL.createObjectURL(blob);

        const img = new Image();
        img.onload = () => {
          setImagePath(imagePath);
          setImageData(dataUrl, { width: img.width, height: img.height });
          clearCocoData();

          if (isComparing) {
            clearComparison();
          }
          addRecentFile({
            path: imagePath,
            name: imagePath.split('/').pop() || imagePath.split('\\').pop() || 'Unknown',
            type: 'image',
          });
          toast.success(
            t('success.imageLoaded'),
            `${t('success.loaded')}: ${imagePath.split('/').pop() || imagePath.split('\\').pop()}`
          );
        };
        img.onerror = () => {
          setError('Failed to load image');
          toast.error(t('errors.loadImageFailed'), t('errors.invalidImageFormat'));
        };
        img.src = dataUrl;
      } catch (error) {
        console.error('Error loading image:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load image';
        setError(errorMessage);
        toast.error(t('errors.loadImageFailed'), errorMessage);
      }
    },
    [
      setImagePath,
      setImageData,
      setLoading,
      setError,
      clearCocoData,
      addRecentFile,
      isComparing,
      clearComparison,
      t,
    ]
  );

  const loadAnnotationsFromPath = useCallback(
    async (jsonPath: string) => {
      const { imageData } = useImageStore.getState();
      const { selectedFolderPath, navigationMode } = useNavigationStore.getState();
      const hasImages = imageData || (navigationMode === 'folder' && selectedFolderPath !== null);

      if (!hasImages) {
        toast.error(t('errors.loadAnnotationFailed'), t('errors.imageRequiredFirst'));
        return;
      }

      try {
        setShowImageSelection(false);
        setTempCocoData(null);

        const data = await invoke<COCOData>('load_annotations', { filePath: jsonPath });
        const annotationDir =
          jsonPath.substring(0, jsonPath.lastIndexOf('/')) ||
          jsonPath.substring(0, jsonPath.lastIndexOf('\\'));

        if (isComparing) {
          clearComparison();
        }

        if (data.images && data.images.length > 1) {
          if (navigationMode === 'folder') {
            setCocoData(data);
            setCurrentImageId(data.images[0].id);
          } else {
            setTempCocoData({ data, annotationDir });
          }
        } else if (data.images && data.images.length === 1) {
          setCocoData(data);
          setCurrentImageId(data.images[0].id);
        } else {
          setCocoData(data);
        }

        addRecentFile({
          path: jsonPath,
          name: jsonPath.split('/').pop() || jsonPath.split('\\').pop() || 'Unknown',
          type: 'annotation',
        });
        toast.success(
          t('success.annotationsLoaded'),
          `${t('success.loaded')} ${data.annotations.length} ${t('controls.annotations').toLowerCase()}`
        );
      } catch (error) {
        console.error('Error loading annotations:', error);
        let errorMessage = 'Failed to load annotations';
        if (error && typeof error === 'object' && 'message' in error) {
          errorMessage = error.message as string;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        setError(errorMessage);
        toast.error(t('errors.loadAnnotationsFailed'), errorMessage);
      }
    },
    [setCocoData, setError, addRecentFile, isComparing, clearComparison, setCurrentImageId, t]
  );

  const handleRecentFileSelect = useCallback(
    (file: RecentFile) => {
      if (file.type === 'image') {
        loadImageFromPath(file.path);
      } else {
        loadAnnotationsFromPath(file.path);
      }
    },
    [loadImageFromPath, loadAnnotationsFromPath]
  );

  return {
    // Dialog states
    showSampleGenerator,
    setShowSampleGenerator,
    showStatistics,
    setShowStatistics,
    showImageSelection,
    setShowImageSelection,
    showComparisonDialog,
    setShowComparisonDialog,
    showHistogramDialog,
    setShowHistogramDialog,
    tempCocoData,
    setTempCocoData,
    hasImagesAvailable,

    // Handlers
    handleOpenImage,
    handleOpenAnnotations,
    handleOpenFolder,
    handleExportAnnotations,
    handleGenerateSample,
    handleShowStatistics,
    handleSampleGenerated,
    loadImageFromPath,
    loadAnnotationsFromPath,
    handleRecentFileSelect,
  };
}
