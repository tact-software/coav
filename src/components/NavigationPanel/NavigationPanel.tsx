import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useImageStore, useAnnotationStore, useLoadingStore } from '../../stores';
import { invoke } from '@tauri-apps/api/core';
import './NavigationPanel.css';

interface ImageMetadata {
  id: number;
  fileName: string;
  filePath: string;
  width: number;
  height: number;
  fileSize?: number;
  exists: boolean;
  loadError?: string;
}

export const NavigationPanel: React.FC = () => {
  const { t } = useTranslation();
  const {
    currentIndex,
    imageList,
    selectedFolderPath,
    navigationMode,
    setCurrentIndex,
    goToNext,
    goToPrevious,
    setImageList,
    resetToSingleMode,
  } = useNavigationStore();

  const {
    setImagePath,
    setImageData,
    setLoading: setImageLoading,
    setPreserveViewState,
  } = useImageStore();
  const { cocoData: currentAnnotation, setCurrentImageId, clearSelection } = useAnnotationStore();
  const { setLoading: setGlobalLoading } = useLoadingStore();
  const [isScanning, setIsScanning] = useState(false);
  const [jumpId, setJumpId] = useState('');
  const [jumpError, setJumpError] = useState('');

  const [shouldResetToSingle, setShouldResetToSingle] = useState(false);

  const handleCloseFolder = useCallback(() => {
    setShouldResetToSingle(true);
  }, []);

  // Effect to handle reset to single mode
  useEffect(() => {
    if (shouldResetToSingle) {
      resetToSingleMode();
      setShouldResetToSingle(false);
    }
  }, [shouldResetToSingle, resetToSingleMode]);

  // Handle image selection
  const handleImageSelect = useCallback(
    async (index: number) => {
      if (index >= 0 && index < imageList.length) {
        const image = imageList[index];
        if (image.exists) {
          setCurrentIndex(index);

          // Store current zoom and pan BEFORE starting image load
          const { zoom, pan } = useImageStore.getState();
          const preservedZoom = zoom;
          const preservedPan = { ...pan };

          // Set flag to preserve view state during image change
          setPreserveViewState(true);

          try {
            setImageLoading(true);
            setGlobalLoading(
              true,
              t('navigation.loadingImage'),
              `${t('navigation.loading')}: ${image.fileName}`
            );
            const imageBytes = await invoke<number[]>('load_image', { filePath: image.filePath });
            const uint8Array = new Uint8Array(imageBytes);
            const blob = new Blob([uint8Array]);
            const dataUrl = URL.createObjectURL(blob);

            const img = new Image();
            img.onload = () => {
              // Set image data first
              setImagePath(image.filePath);
              setImageData(dataUrl, { width: img.width, height: img.height });

              // Restore zoom and pan immediately after setting image data
              const { setZoom, setPan } = useImageStore.getState();
              setZoom(preservedZoom);
              setPan(preservedPan.x, preservedPan.y);

              // Clear the preserve flag after restoration
              setPreserveViewState(false);

              // Update current image ID in annotation store for folder mode
              if (currentAnnotation && navigationMode === 'folder') {
                // Only update if ID actually changed
                if (currentAnnotation.currentImageId !== image.id) {
                  setCurrentImageId(image.id);
                  // Clear selected annotations when switching images
                  clearSelection();
                }
              }

              // End loading after image is fully loaded and displayed
              setImageLoading(false);
              setGlobalLoading(false);
            };
            img.onerror = () => {
              console.error('Failed to load image');
              setPreserveViewState(false);
              setImageLoading(false);
              setGlobalLoading(false);
            };
            img.src = dataUrl;
          } catch (error) {
            console.error('Failed to load image:', error);
            setPreserveViewState(false); // Reset flag on error
            setImageLoading(false);
            setGlobalLoading(false);
          }
        }
      }
    },
    [
      imageList,
      setCurrentIndex,
      setImagePath,
      setImageData,
      setImageLoading,
      currentAnnotation,
      navigationMode,
      setCurrentImageId,
      setPreserveViewState,
      clearSelection,
      setGlobalLoading,
      t,
    ]
  );

  // Track if we should auto-update the image when currentIndex changes
  const [shouldAutoUpdate, setShouldAutoUpdate] = useState(false);

  // Wrapped navigation functions that enable auto-update
  const handleGoToNext = useCallback(() => {
    setShouldAutoUpdate(true);
    goToNext();
  }, [goToNext]);

  const handleGoToPrevious = useCallback(() => {
    setShouldAutoUpdate(true);
    goToPrevious();
  }, [goToPrevious]);

  const handleImageClick = useCallback(
    (index: number) => {
      setShouldAutoUpdate(true);
      handleImageSelect(index);
    },
    [handleImageSelect]
  );

  // Validate ID input
  const validateJumpId = useCallback(
    (value: string) => {
      if (!value.trim()) {
        setJumpError('');
        return;
      }

      // Check if it's a valid number (only half-width digits)
      if (!/^\d+$/.test(value.trim())) {
        setJumpError(t('navigation.invalidIdFormat'));
        return;
      }

      const id = parseInt(value.trim());
      const image = imageList.find((img) => img.id === id);

      if (!image) {
        setJumpError(t('navigation.idNotFound'));
        return;
      }

      if (!image.exists) {
        setJumpError(t('navigation.imageNotExists'));
        return;
      }

      setJumpError('');
    },
    [imageList, t]
  );

  // Handle ID jump
  const handleIdJump = useCallback(() => {
    const trimmedId = jumpId.trim();
    if (!trimmedId || jumpError) return;

    const id = parseInt(trimmedId);
    const imageIndex = imageList.findIndex((img) => img.id === id);
    if (imageIndex !== -1 && imageList[imageIndex].exists) {
      setCurrentIndex(imageIndex);
      setShouldAutoUpdate(true);
      setJumpId('');
      setJumpError('');
    }
  }, [jumpId, jumpError, imageList, setCurrentIndex]);

  // Handle input change
  const handleJumpIdChange = useCallback(
    (value: string) => {
      setJumpId(value);
      validateJumpId(value);
    },
    [validateJumpId]
  );

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (imageList.length === 0) return;

      // Don't handle navigation keys if ID jump input is focused
      if (document.activeElement?.getAttribute('data-id-jump') === 'true') {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          handleGoToNext();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          handleGoToPrevious();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageList, handleGoToNext, handleGoToPrevious]);

  // Update image when currentIndex changes (but only if needed)
  useEffect(() => {
    if (shouldAutoUpdate && currentIndex >= 0 && currentIndex < imageList.length) {
      const currentImage = imageList[currentIndex];
      const { imagePath } = useImageStore.getState();

      // Only reload image if it's actually a different image file
      const isDifferentImage = imagePath !== currentImage.filePath;
      const needsUpdate = shouldAutoUpdate || isDifferentImage;

      if (needsUpdate) {
        handleImageSelect(currentIndex);
      }

      // Always update annotation ID even if image doesn't change
      if (
        currentAnnotation &&
        navigationMode === 'folder' &&
        currentAnnotation.currentImageId !== currentImage.id
      ) {
        setCurrentImageId(currentImage.id);
        // Clear selected annotations when switching images
        clearSelection();
      }

      // Reset auto-update flag after handling
      setShouldAutoUpdate(false);
    }
  }, [
    currentIndex,
    handleImageSelect,
    currentAnnotation,
    imageList,
    shouldAutoUpdate,
    navigationMode,
    setCurrentImageId,
    clearSelection,
  ]);

  // Track previous folder path to detect changes
  const [prevFolderPath, setPrevFolderPath] = useState<string | null>(null);

  // Track the previous currentImageId to detect tab switching
  const [prevCurrentImageId, setPrevCurrentImageId] = useState<number | null>(null);

  // Ensure currentIndex matches annotation's currentImageId when tab becomes visible
  useEffect(() => {
    if (currentAnnotation && currentAnnotation.currentImageId && imageList.length > 0) {
      const imageIndex = imageList.findIndex((img) => img.id === currentAnnotation.currentImageId);

      if (imageIndex !== -1) {
        const currentImage = imageList[imageIndex];
        const { imagePath } = useImageStore.getState();
        const isImageAlreadyLoaded = imagePath === currentImage?.filePath;

        // Case 1: Different index but same image (tab switching) - just sync index
        if (imageIndex !== currentIndex && isImageAlreadyLoaded) {
          setCurrentIndex(imageIndex);
          setPrevCurrentImageId(currentAnnotation.currentImageId as number | null);
        }
        // Case 2: Different image - need to load
        else if (!isImageAlreadyLoaded) {
          setCurrentIndex(imageIndex);
          setPrevCurrentImageId(currentAnnotation.currentImageId as number | null);
          setShouldAutoUpdate(true);
        }
        // Case 3: currentImageId changed but same image (annotation updated) - just update tracker
        else if (currentAnnotation.currentImageId !== prevCurrentImageId) {
          setPrevCurrentImageId(currentAnnotation.currentImageId as number | null);
        }
      }
    }
  }, [
    currentAnnotation?.currentImageId,
    imageList,
    currentIndex,
    setCurrentIndex,
    prevCurrentImageId,
  ]);

  // Auto-scan folder when annotation is loaded and folder is selected or changed
  useEffect(() => {
    const scanFolder = async () => {
      // console.log('📁 Auto-scan folder useEffect', {
      //   hasAnnotation: !!currentAnnotation,
      //   currentImageId: currentAnnotation?.currentImageId,
      //   selectedFolderPath,
      //   imageListLength: imageList.length,
      //   folderChanged: selectedFolderPath !== prevFolderPath
      // });

      // Scan if: annotation exists, folder is selected, and either no images or folder changed
      if (
        currentAnnotation &&
        selectedFolderPath &&
        (imageList.length === 0 || selectedFolderPath !== prevFolderPath)
      ) {
        setIsScanning(true);
        setPrevFolderPath(selectedFolderPath);
        try {
          const images = await invoke<ImageMetadata[]>('scan_folder', {
            path: selectedFolderPath,
            cocoImages: currentAnnotation.images,
          });
          setImageList(images);
          if (images.length > 0) {
            // Preserve the current image if possible, otherwise use currentImageId from annotation
            const { imagePath } = useImageStore.getState();
            let targetIndex = 0;

            // First, try to find the currently loaded image
            if (imagePath) {
              const currentImageIndex = images.findIndex((img) => img.filePath === imagePath);
              if (currentImageIndex !== -1 && images[currentImageIndex].exists) {
                targetIndex = currentImageIndex;
              }
            }

            // If not found and annotation has currentImageId, use that
            if (targetIndex === 0 && currentAnnotation.currentImageId) {
              const imageIndex = images.findIndex(
                (img) => img.id === currentAnnotation.currentImageId
              );
              if (imageIndex !== -1 && images[imageIndex].exists) {
                targetIndex = imageIndex;
              }
            }

            // If target image doesn't exist, find the first existing image
            if (!images[targetIndex]?.exists) {
              targetIndex = images.findIndex((img) => img.exists);
              if (targetIndex === -1) {
                targetIndex = 0; // Fallback to first image if no existing images
              }
            }

            setCurrentIndex(targetIndex);

            // Only force reload if we're not preserving the currently loaded image
            const shouldForceReload = !imagePath || images[targetIndex]?.filePath !== imagePath;

            if (shouldForceReload && images[targetIndex]?.exists) {
              setShouldAutoUpdate(true);
            }
          }
        } catch (error) {
          console.error('Failed to scan folder:', error);
        } finally {
          setIsScanning(false);
        }
      }
    };

    scanFolder();
  }, [
    currentAnnotation?.images,
    selectedFolderPath,
    imageList.length,
    setImageList,
    setCurrentIndex,
    prevFolderPath,
  ]);

  const getImageStatus = (image: ImageMetadata) => {
    if (!image.exists) return '⚠';
    if (imageList[currentIndex]?.id === image.id) return '▶';
    return '✓';
  };

  return (
    <div className="navigation-panel">
      <div className="navigation-header">
        <h3>{t('navigation.title')}</h3>
      </div>

      <div className="folder-info">
        {selectedFolderPath ? (
          <div className="folder-tag">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
            </svg>
            <span className="folder-name" title={selectedFolderPath}>
              {selectedFolderPath.split('/').pop() ||
                selectedFolderPath.split('\\').pop() ||
                selectedFolderPath}
            </span>
            <button
              className="close-button"
              onClick={handleCloseFolder}
              title={t('navigation.closeFolder')}
              disabled={!!currentAnnotation}
              style={{
                opacity: currentAnnotation ? 0.3 : 1,
                cursor: currentAnnotation ? 'not-allowed' : 'pointer',
              }}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="no-folder-message">{t('navigation.noFolderSelected')}</div>
        )}
      </div>

      {imageList.length > 0 && (
        <>
          <div className="navigation-controls">
            <div className="nav-actions">
              <button
                onClick={handleGoToPrevious}
                disabled={
                  currentIndex === 0 || !imageList.slice(0, currentIndex).some((img) => img.exists)
                }
                title={t('navigation.previous')}
                className="nav-button"
              >
                <ChevronLeft size={18} />
              </button>

              <div className="id-jump-wrapper">
                <div className="id-jump-container">
                  <div className="id-jump-input-row">
                    <input
                      type="text"
                      value={jumpId}
                      onChange={(e) => handleJumpIdChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleIdJump();
                        } else if (e.key === 'Escape') {
                          setJumpId('');
                          setJumpError('');
                        }
                      }}
                      placeholder="ID"
                      data-id-jump="true"
                      className={`id-jump-input ${jumpError ? 'error' : ''}`}
                    />
                    <button
                      onClick={handleIdJump}
                      disabled={!jumpId.trim() || !!jumpError}
                      className="id-jump-button"
                      title={t('navigation.jumpToId')}
                    >
                      →
                    </button>
                  </div>
                  {jumpError && <div className="id-jump-error">{jumpError}</div>}
                </div>
              </div>

              <button
                onClick={handleGoToNext}
                disabled={
                  currentIndex === imageList.length - 1 ||
                  !imageList.slice(currentIndex + 1).some((img) => img.exists)
                }
                title={t('navigation.next')}
                className="nav-button"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="image-list">
            {imageList.map((image, index) => (
              <div
                key={image.id}
                className={`image-item ${index === currentIndex ? 'active' : ''} ${!image.exists ? 'missing' : ''}`}
                onClick={() => handleImageClick(index)}
                title={image.filePath}
              >
                <span className="image-status">{getImageStatus(image)}</span>
                <span className="image-id">#{image.id}</span>
                <span className="image-name">{image.fileName}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {isScanning && (
        <div className="loading-overlay">
          <div className="spinner" />
          <p>{t('navigation.scanning')}</p>
        </div>
      )}

      {!isScanning && imageList.length === 0 && !currentAnnotation && (
        <div className="empty-state">
          <p>{selectedFolderPath ? t('navigation.needAnnotation') : t('navigation.needFolder')}</p>
        </div>
      )}

      {!isScanning && currentAnnotation && imageList.length === 0 && (
        <div className="empty-state">
          <p>
            {selectedFolderPath
              ? t('navigation.noImagesInFolder')
              : t('navigation.needFolderForNavigation')}
          </p>
        </div>
      )}
    </div>
  );
};
