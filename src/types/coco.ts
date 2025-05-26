// COCO形式のデータ型定義
export interface COCOInfo {
  description?: string;
  url?: string;
  version?: string;
  year?: number;
  contributor?: string;
  date_created?: string;
  [key: string]: unknown; // 任意の追加フィールド
}

export interface COCOLicense {
  url?: string;
  id: number;
  name: string;
  [key: string]: unknown; // 任意の追加フィールド
}

export interface COCOImage {
  id: number;
  file_name: string;
  width: number;
  height: number;
  license?: number;
  flickr_url?: string;
  coco_url?: string;
  date_captured?: string;
  [key: string]: unknown; // 任意の追加フィールド
}

export interface COCOAnnotation {
  id: number;
  image_id: number;
  category_id: number;
  segmentation: number[][];
  bbox: [number, number, number, number]; // [x, y, width, height]
  area: number;
  iscrowd: 0 | 1;
  option?: Record<string, unknown>; // 独自定義フィールド
  [key: string]: unknown; // その他の任意フィールド
}

export interface COCOCategory {
  id: number;
  name: string;
  supercategory: string;
  color?: string; // 拡張: 表示用の色
  [key: string]: unknown; // 任意の追加フィールド
}

export interface COCOData {
  info?: COCOInfo;
  images: COCOImage[];
  annotations: COCOAnnotation[];
  categories: COCOCategory[];
  licenses?: COCOLicense[];
  [key: string]: unknown; // 任意の追加フィールド
}
