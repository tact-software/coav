use crate::models::COCOData;
use std::fs;
use std::path::Path;

pub mod sample_generator;

#[tauri::command]
#[allow(dead_code)]
pub async fn load_annotations(file_path: String) -> Result<COCOData, String> {
    // ファイルの存在確認
    if !Path::new(&file_path).exists() {
        return Err(format!("File not found: {}", file_path));
    }

    // ファイル読み込み
    let content =
        fs::read_to_string(&file_path).map_err(|e| format!("Failed to read file: {}", e))?;

    // JSONパース
    let coco_data: COCOData =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    // バリデーション
    coco_data.validate()?;

    Ok(coco_data)
}

#[tauri::command]
#[allow(dead_code)]
pub async fn load_image(file_path: String) -> Result<Vec<u8>, String> {
    // ファイルの存在確認
    if !Path::new(&file_path).exists() {
        return Err(format!("Image file not found: {}", file_path));
    }

    // 画像ファイルの読み込み
    let image_data =
        fs::read(&file_path).map_err(|e| format!("Failed to read image file: {}", e))?;

    Ok(image_data)
}
