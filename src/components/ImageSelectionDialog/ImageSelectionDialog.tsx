import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { COCOImage } from '../../types/coco';
import { CommonModal } from '../CommonModal';
import './ImageSelectionDialog.css';

interface ImageSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  images: COCOImage[];
  currentImageFileName?: string;
  onSelect: (image: COCOImage) => void;
}

const ImageSelectionDialog: React.FC<ImageSelectionDialogProps> = ({
  isOpen,
  onClose,
  images,
  currentImageFileName,
  onSelect,
}) => {
  const { t } = useTranslation();
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && images.length > 0) {
      // If current image matches one in the list, select it by default
      const matchingImage = images.find(
        (img) => currentImageFileName && img.file_name === currentImageFileName
      );

      if (matchingImage) {
        setSelectedImageId(matchingImage.id);
      } else {
        // Otherwise select the first image
        setSelectedImageId(images[0].id);
      }
    }
  }, [isOpen, images, currentImageFileName]);

  const handleSelect = () => {
    const selectedImage = images.find((img) => img.id === selectedImageId);
    if (selectedImage) {
      onSelect(selectedImage);
      onClose();
    }
  };

  return (
    <CommonModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('imageSelection.title')}
      size="md"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            {t('imageSelection.cancel')}
          </button>
          <button className="btn btn-primary" onClick={handleSelect} disabled={!selectedImageId}>
            {t('imageSelection.select')}
          </button>
        </>
      }
    >
      <p className="dialog-description">{t('imageSelection.description')}</p>

      {images.length > 0 ? (
        <div className="image-list">
          {images.map((image) => (
            <div
              key={image.id}
              className={`image-item ${selectedImageId === image.id ? 'selected' : ''}`}
              onClick={() => setSelectedImageId(image.id)}
            >
              <div className="image-radio">
                <input
                  type="radio"
                  id={`image-${image.id}`}
                  name="image-selection"
                  checked={selectedImageId === image.id}
                  onChange={() => setSelectedImageId(image.id)}
                />
              </div>
              <label htmlFor={`image-${image.id}`} className="image-info">
                <div className="image-name">{image.file_name}</div>
                <div className="image-details">
                  ID: {image.id} • {image.width}×{image.height}
                </div>
              </label>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-images-message">{t('imageSelection.noImages')}</div>
      )}
    </CommonModal>
  );
};

export default ImageSelectionDialog;
