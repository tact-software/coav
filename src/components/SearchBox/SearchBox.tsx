import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useAnnotationStore } from '../../stores';
import './SearchBox.css';

export interface SearchBoxRef {
  focus: () => void;
}

const SearchBox = forwardRef<SearchBoxRef>((_, ref) => {
  const { t } = useTranslation();
  const {
    searchQuery,
    searchResults,
    currentSearchIndex,
    setSearchQuery,
    nextSearchResult,
    prevSearchResult,
    clearSearch,
  } = useAnnotationStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const [localQuery, setLocalQuery] = useState(searchQuery);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
  }));

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSearchQuery(localQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [localQuery, setSearchQuery]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQuery(e.target.value);
  }, []);

  const handleClear = useCallback(() => {
    setLocalQuery('');
    clearSearch();
  }, [clearSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          prevSearchResult();
        } else {
          nextSearchResult();
        }
      } else if (e.key === 'Escape') {
        handleClear();
      }
    },
    [nextSearchResult, prevSearchResult, handleClear]
  );

  const hasResults = searchResults.length > 0;
  const resultText = hasResults
    ? `${currentSearchIndex + 1} / ${searchResults.length}`
    : searchQuery.trim() && !hasResults
      ? t('common.noResults')
      : '';

  return (
    <div className="search-box">
      <div className="search-input-container">
        <div className="search-icon">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder={t('controls.searchPlaceholder')}
          value={localQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        {localQuery && (
          <button
            className="search-clear"
            onClick={handleClear}
            title={t('search.clear', 'Clear search')}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {(resultText || hasResults) && (
        <div className="search-results">
          <span className="search-result-text">{resultText}</span>
          {hasResults && (
            <div className="search-navigation">
              <button
                className="search-nav-btn"
                onClick={prevSearchResult}
                title={t('search.previousResult', 'Previous result (Shift+Enter)')}
                disabled={searchResults.length <= 1}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                className="search-nav-btn"
                onClick={nextSearchResult}
                title={t('search.nextResult', 'Next result (Enter)')}
                disabled={searchResults.length <= 1}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

SearchBox.displayName = 'SearchBox';

export default SearchBox;
