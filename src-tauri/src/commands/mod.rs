use crate::models::{COCOData, COCOImage};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

pub mod sample_generator;

#[tauri::command]
#[allow(dead_code)]
pub async fn load_annotations(file_path: String) -> Result<COCOData, String> {
    // ファイルの存在確認
    if !Path::new(&file_path).exists() {
        return Err(format!("File not found: {file_path}"));
    }

    // ファイル読み込み
    let content =
        fs::read_to_string(&file_path).map_err(|e| format!("Failed to read file: {e}"))?;

    // JSONパース
    let coco_data: COCOData =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse JSON: {e}"))?;

    // バリデーション
    coco_data.validate()?;

    Ok(coco_data)
}

#[tauri::command]
#[allow(dead_code)]
pub async fn load_image(file_path: String) -> Result<Vec<u8>, String> {
    // ファイルの存在確認
    if !Path::new(&file_path).exists() {
        return Err(format!("Image file not found: {file_path}"));
    }

    // 画像ファイルの読み込み
    let image_data = fs::read(&file_path).map_err(|e| format!("Failed to read image file: {e}"))?;

    Ok(image_data)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageMetadata {
    pub id: i64,
    pub file_name: String,
    pub file_path: String,
    pub width: i32,
    pub height: i32,
    pub file_size: Option<u64>,
    pub exists: bool,
    pub load_error: Option<String>,
}

#[tauri::command]
#[allow(dead_code)]
pub async fn scan_folder(
    path: String,
    coco_images: Vec<COCOImage>,
) -> Result<Vec<ImageMetadata>, String> {
    let folder_path = Path::new(&path);

    // Verify folder exists
    if !folder_path.exists() || !folder_path.is_dir() {
        return Err(format!("Invalid folder path: {path}"));
    }

    let mut image_metadata_list = Vec::new();

    // If no COCO images provided, scan folder for all image files
    if coco_images.is_empty() {
        let supported_extensions = ["jpg", "jpeg", "png", "bmp", "gif", "webp"];

        if let Ok(entries) = fs::read_dir(folder_path) {
            let mut id_counter = 1;
            for entry in entries.flatten() {
                let entry_path = entry.path();
                if entry_path.is_file() {
                    if let Some(extension) = entry_path.extension().and_then(|e| e.to_str()) {
                        if supported_extensions.contains(&extension.to_lowercase().as_str()) {
                            let file_name = entry_path
                                .file_name()
                                .and_then(|f| f.to_str())
                                .unwrap_or("unknown")
                                .to_string();

                            let mut metadata = ImageMetadata {
                                id: id_counter,
                                file_name: file_name.clone(),
                                file_path: entry_path.to_string_lossy().to_string(),
                                width: 0,  // Will be determined when image is loaded
                                height: 0, // Will be determined when image is loaded
                                file_size: None,
                                exists: true,
                                load_error: None,
                            };

                            // Get file size
                            if let Ok(file_metadata) = fs::metadata(&entry_path) {
                                metadata.file_size = Some(file_metadata.len());
                            }

                            image_metadata_list.push(metadata);
                            id_counter += 1;
                        }
                    }
                }
            }
        }

        // Sort by file name for consistent ordering
        image_metadata_list.sort_by(|a, b| a.file_name.cmp(&b.file_name));
    } else {
        // Process each COCO image
        for coco_image in coco_images {
            let mut metadata = ImageMetadata {
                id: coco_image.id,
                file_name: coco_image.file_name.clone(),
                file_path: String::new(),
                width: coco_image.width,
                height: coco_image.height,
                file_size: None,
                exists: false,
                load_error: None,
            };

            // Try to find the image file in the folder
            let image_path = folder_path.join(&coco_image.file_name);

            if image_path.exists() && image_path.is_file() {
                metadata.file_path = image_path.to_string_lossy().to_string();
                metadata.exists = true;

                // Get file size
                if let Ok(file_metadata) = fs::metadata(&image_path) {
                    metadata.file_size = Some(file_metadata.len());
                }
            } else {
                // Try to find in subdirectories
                let file_name_only = Path::new(&coco_image.file_name)
                    .file_name()
                    .and_then(|f| f.to_str())
                    .unwrap_or(&coco_image.file_name);

                if let Ok(entries) = fs::read_dir(folder_path) {
                    for entry in entries.flatten() {
                        if let Ok(entry_path) = entry.path().canonicalize() {
                            if entry_path.is_file()
                                && entry_path.file_name().and_then(|f| f.to_str())
                                    == Some(file_name_only)
                            {
                                metadata.file_path = entry_path.to_string_lossy().to_string();
                                metadata.exists = true;

                                if let Ok(file_metadata) = fs::metadata(&entry_path) {
                                    metadata.file_size = Some(file_metadata.len());
                                }
                                break;
                            }
                        }
                    }
                }

                if !metadata.exists {
                    metadata.load_error = Some(format!("File not found: {}", coco_image.file_name));
                }
            }

            image_metadata_list.push(metadata);
        }
    }

    Ok(image_metadata_list)
}
