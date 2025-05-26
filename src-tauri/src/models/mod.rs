use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct COCOData {
    pub info: Option<COCOInfo>,
    pub images: Vec<COCOImage>,
    pub annotations: Vec<COCOAnnotation>,
    pub categories: Vec<COCOCategory>,
    pub licenses: Option<Vec<COCOLicense>>,
    #[serde(flatten)]
    pub extra: HashMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct COCOInfo {
    pub description: Option<String>,
    pub url: Option<String>,
    pub version: Option<String>,
    pub year: Option<i32>,
    pub contributor: Option<String>,
    pub date_created: Option<String>,
    #[serde(flatten)]
    pub extra: HashMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct COCOLicense {
    pub url: Option<String>,
    pub id: i32,
    pub name: String,
    #[serde(flatten)]
    pub extra: HashMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct COCOImage {
    pub id: i64,
    pub width: i32,
    pub height: i32,
    pub file_name: String,
    pub license: Option<i32>,
    pub flickr_url: Option<String>,
    pub coco_url: Option<String>,
    pub date_captured: Option<String>,
    #[serde(flatten)]
    pub extra: HashMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct COCOAnnotation {
    pub id: i64,
    pub image_id: i64,
    pub category_id: i32,
    pub segmentation: Option<Vec<Vec<f64>>>,
    pub area: f64,
    pub bbox: Vec<f64>, // [x, y, width, height]
    pub iscrowd: i32,
    pub option: Option<Value>,
    #[serde(flatten)]
    pub extra: HashMap<String, Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct COCOCategory {
    pub id: i32,
    pub name: String,
    pub supercategory: Option<String>,
    #[serde(flatten)]
    pub extra: HashMap<String, Value>,
}

impl COCOData {
    #[allow(dead_code)]
    pub fn validate(&self) -> Result<(), String> {
        // 基本的なバリデーション
        if self.images.is_empty() {
            return Err("No images found in COCO data".to_string());
        }

        if self.categories.is_empty() {
            return Err("No categories found in COCO data".to_string());
        }

        // BBoxの検証
        for annotation in &self.annotations {
            if annotation.bbox.len() != 4 {
                return Err(format!(
                    "Invalid bbox format for annotation {}",
                    annotation.id
                ));
            }
        }

        Ok(())
    }
}
