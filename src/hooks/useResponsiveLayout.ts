import { useState, useEffect } from 'react';

export type ScreenSize = 'large' | 'medium' | 'compact' | 'small';
export type PanelLayout = 'sidebar' | 'overlay';

interface ResponsiveState {
  screenSize: ScreenSize;
  leftPanelVisible: boolean;
  rightPanelVisible: boolean;
  leftPanelLayout: PanelLayout;
  rightPanelLayout: PanelLayout;
}

const BREAKPOINTS = {
  small: 600,
  compact: 900,
  medium: 1200,
} as const;

export const useResponsiveLayout = () => {
  const [state, setState] = useState<ResponsiveState>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1920;
    return getInitialState(width);
  });

  // Get initial state based on screen width
  function getInitialState(width: number): ResponsiveState {
    if (width > BREAKPOINTS.medium) {
      // Large screen: show both panels as sidebars
      return {
        screenSize: 'large',
        leftPanelVisible: true,
        rightPanelVisible: true,
        leftPanelLayout: 'sidebar',
        rightPanelLayout: 'sidebar',
      };
    } else if (width > BREAKPOINTS.compact) {
      // Medium screen: unified horizontal panel
      return {
        screenSize: 'medium',
        leftPanelVisible: false,
        rightPanelVisible: false,
        leftPanelLayout: 'overlay',
        rightPanelLayout: 'overlay',
      };
    } else if (width > BREAKPOINTS.small) {
      // Compact screen: unified vertical panel
      return {
        screenSize: 'compact',
        leftPanelVisible: false,
        rightPanelVisible: false,
        leftPanelLayout: 'overlay',
        rightPanelLayout: 'overlay',
      };
    } else {
      // Small screen: unified vertical panel
      return {
        screenSize: 'small',
        leftPanelVisible: false,
        rightPanelVisible: false,
        leftPanelLayout: 'overlay',
        rightPanelLayout: 'overlay',
      };
    }
  }

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const newState = getInitialState(width);

      setState((prev) => ({
        ...newState,
        // Preserve panel visibility preferences when possible
        leftPanelVisible:
          newState.screenSize === 'large'
            ? true
            : newState.screenSize === 'medium'
              ? prev.leftPanelVisible
              : newState.screenSize === 'compact'
                ? prev.leftPanelVisible
                : newState.screenSize === 'small'
                  ? false
                  : false,
        rightPanelVisible:
          newState.screenSize === 'large'
            ? true
            : newState.screenSize === 'medium'
              ? prev.rightPanelVisible
              : newState.screenSize === 'compact'
                ? prev.rightPanelVisible
                : newState.screenSize === 'small'
                  ? false
                  : false,
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Toggle functions
  const toggleLeftPanel = () => {
    setState((prev) => ({
      ...prev,
      leftPanelVisible: !prev.leftPanelVisible,
    }));
  };

  const toggleRightPanel = () => {
    setState((prev) => ({
      ...prev,
      rightPanelVisible: !prev.rightPanelVisible,
    }));
  };

  const hideAllPanels = () => {
    setState((prev) => ({
      ...prev,
      leftPanelVisible: false,
      rightPanelVisible: false,
    }));
  };

  // Auto-show right panel when annotation is selected
  const showRightPanelForSelection = () => {
    setState((prev) => ({
      ...prev,
      rightPanelVisible: true,
    }));
  };

  // Check if panels should be rendered
  const shouldRenderLeftPanel = state.leftPanelLayout === 'sidebar' || state.leftPanelVisible;
  const shouldRenderRightPanel = state.rightPanelLayout === 'sidebar' || state.rightPanelVisible;

  return {
    ...state,
    toggleLeftPanel,
    toggleRightPanel,
    hideAllPanels,
    showRightPanelForSelection,
    shouldRenderLeftPanel,
    shouldRenderRightPanel,
    isSmallScreen: state.screenSize === 'small',
    isCompactScreen: state.screenSize === 'compact',
    isMediumScreen: state.screenSize === 'medium',
    isLargeScreen: state.screenSize === 'large',
  };
};
