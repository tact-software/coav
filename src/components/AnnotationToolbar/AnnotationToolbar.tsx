import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useEditorStore,
  useHistoryStore,
  useModeStore,
  useAnnotationStore,
  generateCategoryColor,
} from '../../stores';
import { useFileOperations } from '../../hooks/useFileOperations';
import type { EditorTool, EditAction } from '../../types';
import type { EditableAnnotation } from '../../types/editor';
import './AnnotationToolbar.css';

export function AnnotationToolbar() {
  const { t } = useTranslation();
  const { handleSaveAnnotations } = useFileOperations();
  const mode = useModeStore((state) => state.mode);
  const currentTool = useEditorStore((state) => state.currentTool);
  const setTool = useEditorStore((state) => state.setTool);
  const hasChanges = useEditorStore((state) => state.hasChanges);
  const currentCategoryId = useEditorStore((state) => state.currentCategoryId);
  const setCurrentCategoryId = useEditorStore((state) => state.setCurrentCategoryId);

  const canUndo = useHistoryStore((state) => state.canUndo());
  const canRedo = useHistoryStore((state) => state.canRedo());
  const undoHistory = useHistoryStore((state) => state.undo);
  const redoHistory = useHistoryStore((state) => state.redo);
  const pushHistory = useHistoryStore((state) => state.push);

  const {
    cocoData,
    addAnnotation,
    deleteAnnotation,
    updateAnnotation,
    selectedAnnotationIds,
    getSelectedAnnotations,
  } = useAnnotationStore();

  // カテゴリ一覧
  const categories = cocoData?.categories ?? [];

  // 初期カテゴリを設定
  useEffect(() => {
    if (currentCategoryId === null && categories.length > 0) {
      setCurrentCategoryId(categories[0].id);
    }
  }, [categories, currentCategoryId, setCurrentCategoryId]);

  // アクションを適用する（Undo時は逆操作、Redo時は順操作）
  const applyAction = useCallback(
    (action: EditAction, isUndo: boolean) => {
      switch (action.type) {
        case 'CREATE':
          if (isUndo) {
            // Undo: 作成を取り消し → 削除
            deleteAnnotation(action.annotation.id);
          } else {
            // Redo: 再作成
            addAnnotation(action.annotation);
          }
          break;
        case 'DELETE':
          if (isUndo) {
            // Undo: 削除を取り消し → 復元
            addAnnotation(action.annotation);
          } else {
            // Redo: 再削除
            deleteAnnotation(action.annotation.id);
          }
          break;
        case 'UPDATE':
          if (isUndo) {
            // Undo: 変更前の状態に戻す
            updateAnnotation(action.id, action.before);
          } else {
            // Redo: 変更後の状態に戻す
            updateAnnotation(action.id, action.after);
          }
          break;
        case 'BATCH':
          // バッチ操作は逆順で適用（Undoの場合）
          const actions = isUndo ? [...action.actions].reverse() : action.actions;
          actions.forEach((a) => applyAction(a, isUndo));
          break;
      }
    },
    [addAnnotation, deleteAnnotation, updateAnnotation]
  );

  const handleUndo = useCallback(() => {
    const entry = undoHistory();
    if (entry) {
      applyAction(entry.action, true);
    }
  }, [undoHistory, applyAction]);

  const handleRedo = useCallback(() => {
    const entry = redoHistory();
    if (entry) {
      applyAction(entry.action, false);
    }
  }, [redoHistory, applyAction]);

  // 選択中のアノテーションを削除
  const handleDelete = useCallback(() => {
    const selectedAnnotations = getSelectedAnnotations();
    if (selectedAnnotations.length === 0) return;

    // 履歴に追加（バッチ削除）
    if (selectedAnnotations.length === 1) {
      const ann = selectedAnnotations[0];
      const editableAnn: EditableAnnotation = { ...ann, zIndex: 0 };
      pushHistory({ type: 'DELETE', annotation: editableAnn }, 'アノテーションを削除');
      deleteAnnotation(ann.id);
    } else {
      const deleteActions: EditAction[] = selectedAnnotations.map((ann) => ({
        type: 'DELETE' as const,
        annotation: { ...ann, zIndex: 0 } as EditableAnnotation,
      }));
      pushHistory({ type: 'BATCH', actions: deleteActions }, `${selectedAnnotations.length}件のアノテーションを削除`);
      selectedAnnotations.forEach((ann) => deleteAnnotation(ann.id));
    }
  }, [getSelectedAnnotations, deleteAnnotation, pushHistory]);

  if (mode !== 'annotation') {
    return null;
  }

  const hasSelection = selectedAnnotationIds.length > 0;

  const tools: { key: EditorTool; icon: React.ReactNode; label: string }[] = [
    {
      key: 'select',
      label: t('editor.tools.select'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          <path d="M13 13l6 6" />
        </svg>
      ),
    },
    {
      key: 'bbox',
      label: t('editor.tools.bbox'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      ),
    },
    {
      key: 'polygon',
      label: t('editor.tools.polygon'),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
        </svg>
      ),
    },
  ];

  const handleSave = useCallback(() => {
    handleSaveAnnotations();
  }, [handleSaveAnnotations]);

  return (
    <div className="annotation-toolbar">
      <div className="annotation-toolbar__group">
        {tools.map(({ key, icon, label }) => (
          <button
            key={key}
            className={`annotation-toolbar__button ${currentTool === key ? 'annotation-toolbar__button--active' : ''}`}
            onClick={() => setTool(key)}
            title={label}
          >
            {icon}
          </button>
        ))}
      </div>

      <div className="annotation-toolbar__separator" />

      {/* カテゴリセレクター */}
      {categories.length > 0 && (
        <div className="annotation-toolbar__category">
          <select
            className="annotation-toolbar__category-select"
            value={currentCategoryId ?? ''}
            onChange={(e) => setCurrentCategoryId(Number(e.target.value))}
            title={t('editor.selectCategory')}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <div
            className="annotation-toolbar__category-color"
            style={{ backgroundColor: generateCategoryColor(currentCategoryId ?? 1) }}
          />
        </div>
      )}

      <div className="annotation-toolbar__separator" />

      <div className="annotation-toolbar__group">
        <button
          className="annotation-toolbar__button"
          onClick={handleUndo}
          disabled={!canUndo}
          title={t('editor.undo')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </button>
        <button
          className="annotation-toolbar__button"
          onClick={handleRedo}
          disabled={!canRedo}
          title={t('editor.redo')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
          </svg>
        </button>
        <button
          className="annotation-toolbar__button annotation-toolbar__button--danger"
          onClick={handleDelete}
          disabled={!hasSelection}
          title={t('editor.delete')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      <div className="annotation-toolbar__spacer" />

      <button
        className="annotation-toolbar__save-button"
        onClick={handleSave}
        disabled={!hasChanges}
        title={t('editor.save')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
        {t('editor.save')}
      </button>
    </div>
  );
}
