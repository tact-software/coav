import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './CommonModal.css';

interface CommonModalProps {
  /** モーダルの表示/非表示 */
  isOpen: boolean;

  /** モーダルを閉じる関数 */
  onClose: () => void;

  /** モーダルのタイトル */
  title: string;

  /** モーダル内に表示するコンテンツ */
  children: React.ReactNode;

  /** フッター部分のコンテンツ（オプション） */
  footer?: React.ReactNode;

  /** モーダルのサイズ */
  size?: 'sm' | 'md' | 'lg' | 'xl';

  /** 背景にblur効果を適用するか */
  hasBlur?: boolean;

  /** 追加のCSSクラス名 */
  className?: string;

  /** ESCキーで閉じるかどうか */
  closeOnEsc?: boolean;

  /** オーバーレイクリックで閉じるかどうか */
  closeOnOverlay?: boolean;
}

export const CommonModal: React.FC<CommonModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  hasBlur = false,
  className = '',
  closeOnEsc = true,
  closeOnOverlay = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // ESCキーでモーダルを閉じる
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEsc]);

  // フォーカス管理
  useEffect(() => {
    if (isOpen) {
      // 現在のフォーカス要素を保存
      previousActiveElement.current = document.activeElement as HTMLElement;

      // モーダル内の最初のフォーカス可能要素にフォーカス
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements && focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }
    } else {
      // モーダルを閉じたら元の要素にフォーカスを戻す
      previousActiveElement.current?.focus();
    }
  }, [isOpen]);

  // オーバーレイクリック処理
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlay && e.target === e.currentTarget) {
      onClose();
    }
  };

  // モーダルを表示しない場合
  if (!isOpen) return null;

  const modalContent = (
    <div
      className={`common-modal-overlay ${hasBlur ? 'common-modal-overlay--blur' : ''}`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className={`common-modal common-modal--${size} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="common-modal-header">
          <h2 id="modal-title" className="common-modal-title">
            {title}
          </h2>
          <button className="common-modal-close" onClick={onClose} aria-label="閉じる">
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

        <div className="common-modal-body">{children}</div>

        {footer && <div className="common-modal-footer">{footer}</div>}
      </div>
    </div>
  );

  // React Portalを使用してbody直下にレンダリング
  return createPortal(modalContent, document.body);
};
