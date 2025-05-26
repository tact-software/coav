import { COCOData } from './coco';

// アプリケーション全体の型定義
export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ViewState {
  zoom: number;
  offset: Point;
  showLabels: boolean;
  showBBoxes: boolean;
  showPolygons: boolean;
  opacity: number;
}

export interface ImageState {
  src: string | null;
  size: Size | null;
  loaded: boolean;
  error: string | null;
}

export interface AnnotationState {
  data: COCOData | null;
  selected: number[];
  visible: number[];
  hovering: number | null;
}

export interface FilterState {
  categories: Set<number>;
  minArea: number;
  maxArea: number;
  searchQuery: string;
}

export interface AppState {
  image: ImageState;
  annotations: AnnotationState;
  view: ViewState;
  filter: FilterState;
}
