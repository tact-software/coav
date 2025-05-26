import { useEffect, useRef } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { toast } from '../stores';

interface DragAndDropOptions {
  onImageDrop?: (imagePath: string) => void;
  onAnnotationDrop?: (annotationPath: string) => void;
}

export const useDragAndDrop = ({ onImageDrop, onAnnotationDrop }: DragAndDropOptions) => {
  const dragCounter = useRef(0);

  useEffect(() => {
    // Visual feedback handlers for HTML5 drag and drop
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current++;

      if (e.dataTransfer?.items) {
        const files = Array.from(e.dataTransfer.items);
        const hasValidFile = files.some((item) => {
          if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file) {
              const isImage = file.type.startsWith('image/');
              const isJson = file.type === 'application/json' || file.name.endsWith('.json');
              return isImage || isJson;
            }
          }
          return false;
        });

        if (hasValidFile) {
          document.body.classList.add('drag-over');
        }
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current--;

      if (dragCounter.current === 0) {
        document.body.classList.remove('drag-over');
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      document.body.classList.remove('drag-over');
    };

    // Add HTML5 event listeners for visual feedback
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    // Tauri file drop handler
    const appWindow = getCurrentWebviewWindow();
    const unlistenPromise = appWindow.onDragDropEvent((event) => {
      if (event.payload.type === 'drop') {
        const paths = event.payload.paths;

        for (const filePath of paths) {
          const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || '';
          const lowerCasePath = filePath.toLowerCase();

          if (
            lowerCasePath.endsWith('.jpg') ||
            lowerCasePath.endsWith('.jpeg') ||
            lowerCasePath.endsWith('.png')
          ) {
            if (onImageDrop) {
              try {
                onImageDrop(filePath);
                toast.info('Processing dropped image...', fileName);
              } catch {
                toast.error('Failed to process dropped image', fileName);
              }
            }
          } else if (lowerCasePath.endsWith('.json')) {
            if (onAnnotationDrop) {
              try {
                onAnnotationDrop(filePath);
                toast.info('Processing dropped annotations...', fileName);
              } catch {
                toast.error('Failed to process dropped annotations', fileName);
              }
            }
          } else {
            toast.warning(
              'Unsupported file type',
              `${fileName} is not a supported image or JSON file`
            );
          }
        }
      }
    });

    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
      document.body.classList.remove('drag-over');

      // Clean up Tauri listener
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [onImageDrop, onAnnotationDrop]);
};

export default useDragAndDrop;
