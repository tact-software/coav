use crate::models::{COCOAnnotation, COCOCategory, COCOData, COCOImage, COCOInfo, COCOLicense};
use image::{Rgb, RgbImage};
use imageproc::drawing::{draw_filled_rect_mut, draw_polygon_mut};
use imageproc::rect::Rect;
use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone)]
#[allow(dead_code)]
struct Shape {
    category_id: i32,
    bbox: [f64; 4],
    segmentation: Vec<f64>,
    area: f64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SampleGeneratorParams {
    pub width: u32,
    pub height: u32,
    pub output_dir: String,
    pub image_count: Option<u32>,
    pub class_count: Option<u32>,
    pub annotation_count: Option<u32>,
    pub filename: Option<String>,
    pub max_object_size: Option<u32>,
    pub allow_overlap: Option<bool>,
    pub include_licenses: Option<bool>,
    pub include_option: Option<bool>,
    pub include_multi_polygon: Option<bool>,
    pub include_pair_json: Option<bool>,
    pub change_pair_category_names: Option<bool>, // Whether to change category names in pair file
    pub max_pair_matches: Option<u32>, // Maximum number of matching pairs per annotation (for pair generation)
    pub pair_perfect_match_ratio: Option<f32>, // Ratio of perfect matches (0.0-1.0)
    pub pair_partial_match_ratio: Option<f32>, // Ratio of partial matches (0.0-1.0)
    pub pair_no_match_ratio: Option<f32>, // Ratio of no matches/FN (0.0-1.0)
    pub pair_additional_ratio: Option<f32>, // Ratio of additional objects/FP (0.0-1.0)
}

#[tauri::command]
#[allow(dead_code)]
pub async fn generate_sample_data(params: SampleGeneratorParams) -> Result<String, String> {
    let mut rng = rand::thread_rng();

    // Extract parameters
    let width = params.width;
    let height = params.height;
    let output_dir = params.output_dir;

    // Use provided values or defaults
    let num_images = params.image_count.unwrap_or(1).min(10); // Maximum 10 images
    let num_classes = params.class_count.unwrap_or(4).min(10); // Maximum 10 classes
    let num_annotations = params.annotation_count.unwrap_or(10);
    let base_filename = params.filename.unwrap_or_else(|| "sample".to_string());
    let max_size = params
        .max_object_size
        .unwrap_or(80)
        .min(width.min(height) / 2); // デフォルトは80px、画像サイズの半分を超えない
    let allow_overlap = params.allow_overlap.unwrap_or(true); // デフォルトは重なりを許可

    // Create output directory if it doesn't exist
    fs::create_dir_all(&output_dir)
        .map_err(|e| format!("Failed to create output directory: {}", e))?;

    // Define all possible categories
    let all_categories = vec![
        ("rectangle", "shape"),
        ("triangle", "shape"),
        ("pentagon", "shape"),
        ("hexagon", "shape"),
        ("octagon", "shape"),
        ("diamond", "shape"),
        ("star", "shape"),
        ("cross", "shape"),
        ("arrow", "shape"),
        ("house", "shape"),
    ];

    // Create categories based on num_classes
    let categories: Vec<COCOCategory> = all_categories
        .iter()
        .take(num_classes as usize)
        .enumerate()
        .map(|(i, (name, supercategory))| COCOCategory {
            id: (i + 1) as i32,
            name: name.to_string(),
            supercategory: Some(supercategory.to_string()),
            extra: HashMap::new(),
        })
        .collect();

    // Create licenses if requested
    let licenses = if params.include_licenses.unwrap_or(false) {
        Some(vec![
            COCOLicense {
                url: Some("http://creativecommons.org/licenses/by/4.0/".to_string()),
                id: 1,
                name: "Attribution License".to_string(),
                extra: HashMap::new(),
            },
            COCOLicense {
                url: Some("http://creativecommons.org/licenses/by-nc/4.0/".to_string()),
                id: 2,
                name: "Attribution-NonCommercial License".to_string(),
                extra: HashMap::new(),
            },
        ])
    } else {
        None
    };

    // Generate consistent option structure for all annotations
    let option_template = if params.include_option.unwrap_or(false) {
        Some(json!({
            "detection": {
                "confidence": 0.0,
                "model": {
                    "name": "sample_model",
                    "version": "1.0.0",
                    "parameters": {
                        "threshold": 0.5,
                        "nms_threshold": 0.4
                    }
                }
            },
            "metadata": {
                "annotator": "system",
                "timestamp": "2024-01-01T00:00:00Z",
                "quality": {
                    "score": 0.0,
                    "verified": false,
                    "notes": ""
                }
            },
            "custom": {
                "difficulty": "easy",
                "visibility": {
                    "percentage": 0.0,
                    "occlusion": false
                }
            }
        }))
    } else {
        None
    };

    let generate_option_for_annotation = |rng: &mut rand::rngs::ThreadRng| -> Value {
        json!({
            "detection": {
                "confidence": rng.gen_range(0.5..1.0),
                "model": {
                    "name": "sample_model",
                    "version": "1.0.0",
                    "parameters": {
                        "threshold": 0.5,
                        "nms_threshold": 0.4
                    }
                }
            },
            "metadata": {
                "annotator": "system",
                "timestamp": chrono::Local::now().to_rfc3339(),
                "quality": {
                    "score": rng.gen_range(0.6..1.0),
                    "verified": rng.gen_bool(0.7),
                    "notes": format!("Generated annotation {}", rng.gen_range(1000..9999))
                }
            },
            "custom": {
                "difficulty": match rng.gen_range(0..3) {
                    0 => "easy",
                    1 => "medium",
                    _ => "hard"
                },
                "visibility": {
                    "percentage": rng.gen_range(0.3..1.0),
                    "occlusion": rng.gen_bool(0.3)
                }
            }
        })
    };

    let mut all_images = Vec::new();
    let mut all_annotations = Vec::new();
    let mut annotation_id_counter = 1i64;

    // Generate multiple images
    for image_idx in 0..num_images {
        // Create image
        let mut img = RgbImage::new(width, height);

        // Fill with white background
        for pixel in img.pixels_mut() {
            *pixel = Rgb([255, 255, 255]);
        }

        // Generate random shapes
        let mut shapes = Vec::new();
        let num_shapes = num_annotations;

        // Helper function to check if two bounding boxes overlap
        let boxes_overlap = |bbox1: &[f64; 4], bbox2: &[f64; 4]| -> bool {
            let x1 = bbox1[0];
            let y1 = bbox1[1];
            let w1 = bbox1[2];
            let h1 = bbox1[3];

            let x2 = bbox2[0];
            let y2 = bbox2[1];
            let w2 = bbox2[2];
            let h2 = bbox2[3];

            !(x1 + w1 < x2 || x2 + w2 < x1 || y1 + h1 < y2 || y2 + h2 < y1)
        };

        let mut attempts = 0;
        let max_attempts = num_shapes * 100; // 各シェイプに対して最大100回試行

        // Generate shapes until we reach the requested number or run out of attempts
        // When overlap is not allowed and space runs out, we'll generate fewer shapes than requested
        while shapes.len() < num_shapes as usize && attempts < max_attempts {
            attempts += 1;
            let category_id = rng.gen_range(1..=num_classes) as i32;

            // Use gray colors for all objects
            let gray_value = 128; // Medium gray
            let color = Rgb([gray_value, gray_value, gray_value]);

            // First generate shape without drawing to check for overlaps
            let candidate_shape = match category_id {
                1 => generate_rectangle_shape(&mut rng, width, height, category_id, max_size),
                2 => generate_triangle_shape(&mut rng, width, height, category_id, max_size),
                3 => generate_pentagon_shape(&mut rng, width, height, category_id, max_size),
                4 => generate_hexagon_shape(&mut rng, width, height, category_id, max_size),
                5 => generate_octagon_shape(&mut rng, width, height, category_id, max_size),
                6 => generate_diamond_shape(&mut rng, width, height, category_id, max_size),
                7 => generate_star_shape(&mut rng, width, height, category_id, max_size),
                8 => generate_cross_shape(&mut rng, width, height, category_id, max_size),
                9 => generate_arrow_shape(&mut rng, width, height, category_id, max_size),
                10 => generate_house_shape(&mut rng, width, height, category_id, max_size),
                _ => continue,
            };

            // Check for overlaps if not allowed
            if !allow_overlap
                && shapes
                    .iter()
                    .any(|s: &Shape| boxes_overlap(&candidate_shape.bbox, &s.bbox))
            {
                continue;
            }

            // Now draw the shape on the image
            match category_id {
                1 => draw_rectangle(&mut img, &candidate_shape, color),
                2 => draw_triangle(&mut img, &candidate_shape, color),
                3 => draw_pentagon(&mut img, &candidate_shape, color),
                4 => draw_hexagon(&mut img, &candidate_shape, color),
                5 => draw_octagon(&mut img, &candidate_shape, color),
                6 => draw_diamond(&mut img, &candidate_shape, color),
                7 => draw_star(&mut img, &candidate_shape, color),
                8 => draw_cross(&mut img, &candidate_shape, color),
                9 => draw_arrow(&mut img, &candidate_shape, color),
                10 => draw_house(&mut img, &candidate_shape, color),
                _ => continue,
            }

            shapes.push(candidate_shape);
        }

        // Save image
        let image_filename = if num_images == 1 {
            format!("{}-image.png", base_filename)
        } else {
            format!("{}-image-{}.png", base_filename, image_idx + 1)
        };
        let image_path = Path::new(&output_dir).join(&image_filename);
        img.save(&image_path)
            .map_err(|e| format!("Failed to save image: {}", e))?;

        // Store image info
        all_images.push(COCOImage {
            id: (image_idx + 1) as i64,
            width: width as i32,
            height: height as i32,
            file_name: image_filename.to_string(),
            license: if licenses.is_some() {
                Some(rng.gen_range(1..=2))
            } else {
                None
            },
            flickr_url: None,
            coco_url: None,
            date_captured: None,
            extra: HashMap::new(),
        });

        // Create annotations for this image
        let shapes_for_annotations = shapes.clone();
        let image_annotations: Vec<COCOAnnotation> = shapes_for_annotations
            .into_iter()
            .enumerate()
            .map(|(i, shape)| {
                let option = if option_template.is_some() {
                    Some(generate_option_for_annotation(&mut rng))
                } else {
                    None
                };

                let (segmentation, bbox) =
                    if params.include_multi_polygon.unwrap_or(false) && rng.gen_bool(0.3) {
                        // 30% chance to add multi-polygon
                        let multi_polygons = generate_multi_polygon_segmentation(
                            &shape,
                            &mut rng,
                            width,
                            height,
                            &shapes[0..i], // Check against existing shapes
                        );

                        // Calculate combined bounding box for all polygons
                        let combined_bbox = calculate_combined_bbox(&multi_polygons);
                        (multi_polygons, combined_bbox)
                    } else {
                        (vec![shape.segmentation.clone()], shape.bbox.to_vec())
                    };

                let annotation = COCOAnnotation {
                    id: annotation_id_counter,
                    image_id: (image_idx + 1) as i64,
                    category_id: shape.category_id,
                    segmentation: Some(segmentation),
                    area: shape.area,
                    bbox,
                    iscrowd: 0,
                    option,
                    extra: HashMap::new(),
                };
                annotation_id_counter += 1;
                annotation
            })
            .collect();

        all_annotations.extend(image_annotations);
    }

    // Create COCO data
    let coco_data = COCOData {
        info: Some(COCOInfo {
            description: Some("Sample COCO dataset generated for testing".to_string()),
            url: None,
            version: Some("1.0".to_string()),
            year: Some(2024),
            contributor: Some("COAV".to_string()),
            date_created: Some(chrono::Local::now().to_rfc3339()),
            extra: HashMap::new(),
        }),
        images: all_images,
        annotations: all_annotations,
        categories,
        licenses,
        extra: HashMap::new(),
    };

    // Save COCO JSON
    let json_filename = format!("{}-annotation.json", base_filename);
    let json_path = Path::new(&output_dir).join(&json_filename);
    let json_content = serde_json::to_string_pretty(&coco_data)
        .map_err(|e| format!("Failed to serialize COCO data: {}", e))?;
    fs::write(&json_path, json_content).map_err(|e| format!("Failed to save JSON file: {}", e))?;

    // Generate pair JSON if requested
    if params.include_pair_json.unwrap_or(false) {
        let max_pair_matches = params.max_pair_matches.unwrap_or(1);
        let distribution = (
            params.pair_perfect_match_ratio.unwrap_or(0.25),
            params.pair_partial_match_ratio.unwrap_or(0.35),
            params.pair_no_match_ratio.unwrap_or(0.20),
            params.pair_additional_ratio.unwrap_or(0.20),
        );
        let change_category_names = params.change_pair_category_names.unwrap_or(false);
        let pair_coco_data = generate_pair_json(
            &coco_data,
            &mut rng,
            max_pair_matches,
            distribution,
            change_category_names,
        );
        let pair_json_filename = format!("{}-pair.json", base_filename);
        let pair_json_path = Path::new(&output_dir).join(&pair_json_filename);
        let pair_json_content = serde_json::to_string_pretty(&pair_coco_data)
            .map_err(|e| format!("Failed to serialize pair COCO data: {}", e))?;
        fs::write(&pair_json_path, pair_json_content)
            .map_err(|e| format!("Failed to save pair JSON file: {}", e))?;
    }

    let total_annotations = coco_data.annotations.len();
    let message = format!(
        "Sample data generated successfully in {} with {} images, {} classes and {} total annotations",
        output_dir, num_images, num_classes, total_annotations
    );
    Ok(message)
}

fn generate_pair_json(
    original_data: &COCOData,
    rng: &mut rand::rngs::ThreadRng,
    max_pair_matches: u32,
    distribution: (f32, f32, f32, f32),
    change_category_names: bool,
) -> COCOData {
    let mut pair_annotations = Vec::new();
    let mut annotation_id_counter = 1;

    println!(
        "Generating pair JSON with max_pair_matches: {}",
        max_pair_matches
    );

    // Define distribution of matching patterns using the provided tuple
    let (perfect_ratio, partial_ratio, no_match_ratio, additional_ratio) = distribution;
    let total_annotations = original_data.annotations.len();
    let perfect_match_count = (total_annotations as f32 * perfect_ratio).round() as usize;
    let partial_match_count = (total_annotations as f32 * partial_ratio).round() as usize;
    let no_match_count = (total_annotations as f32 * no_match_ratio).round() as usize;
    let additional_count = (total_annotations as f32 * additional_ratio).round() as usize;

    println!(
        "Distribution: {} perfect, {} partial, {} no match, {} additional",
        perfect_match_count, partial_match_count, no_match_count, additional_count
    );

    let mut annotation_indices: Vec<usize> = (0..original_data.annotations.len()).collect();
    use rand::seq::SliceRandom;
    annotation_indices.shuffle(rng);

    // Process each original annotation according to the distribution
    for (ann_idx, annotation) in original_data.annotations.iter().enumerate() {
        let match_type = if ann_idx < perfect_match_count {
            "perfect"
        } else if ann_idx < perfect_match_count + partial_match_count {
            "partial"
        } else if ann_idx < perfect_match_count + partial_match_count + no_match_count {
            "no_match"
        } else {
            "multiple"
        };

        println!("Processing annotation {} as {}", ann_idx, match_type);

        match match_type {
            "perfect" => {
                // Perfect match - exact copy with same category and shape
                let mut pair_annotation = annotation.clone();
                pair_annotation.id = annotation_id_counter;
                annotation_id_counter += 1;
                pair_annotations.push(pair_annotation);
            }
            "partial" => {
                // Partial match - shift to create partial overlap but keep same category
                let mut pair_annotation = annotation.clone();
                pair_annotation.id = annotation_id_counter;
                annotation_id_counter += 1;

                // Shift by 30-60% of the object size to create partial overlap
                let shift_factor = rng.gen_range(0.3..0.6);
                let shift_x = pair_annotation.bbox[2]
                    * shift_factor
                    * (if rng.gen_bool(0.5) { 1.0 } else { -1.0 });
                let shift_y = pair_annotation.bbox[3]
                    * shift_factor
                    * (if rng.gen_bool(0.5) { 1.0 } else { -1.0 });

                // Calculate actual shift applied after bounds checking
                let original_x = annotation.bbox[0];
                let original_y = annotation.bbox[1];

                // Apply shift with bounds checking
                pair_annotation.bbox[0] = (pair_annotation.bbox[0] + shift_x)
                    .max(0.0)
                    .min(original_data.images[0].width as f64 - pair_annotation.bbox[2]);
                pair_annotation.bbox[1] = (pair_annotation.bbox[1] + shift_y)
                    .max(0.0)
                    .min(original_data.images[0].height as f64 - pair_annotation.bbox[3]);

                let actual_shift_x = pair_annotation.bbox[0] - original_x;
                let actual_shift_y = pair_annotation.bbox[1] - original_y;

                // Also shift segmentation if present using actual shift amounts
                if let Some(segmentation) = &mut pair_annotation.segmentation {
                    for polygon in segmentation.iter_mut() {
                        for i in (0..polygon.len()).step_by(2) {
                            polygon[i] += actual_shift_x;
                            if i + 1 < polygon.len() {
                                polygon[i + 1] += actual_shift_y;
                            }
                        }
                    }
                }

                // Recalculate area after transformation
                pair_annotation.area = pair_annotation.bbox[2] * pair_annotation.bbox[3];

                pair_annotations.push(pair_annotation);
            }
            "no_match" => {
                // No match - skip this annotation (creates FN in original)
                // Do nothing, this creates a false negative
            }
            "multiple" => {
                // For remaining annotations, create multiple matches if configured
                let num_matches = if max_pair_matches > 1 && rng.gen_bool(0.3) {
                    rng.gen_range(2..=max_pair_matches)
                } else {
                    1
                };

                println!(
                    "Creating {} matches for annotation {}",
                    num_matches, ann_idx
                );

                for match_idx in 0..num_matches {
                    // Multiple matches with variations
                    let operation = if match_idx == 0 {
                        0 // First match: exact copy
                    } else {
                        1 // Additional matches: always shift
                    };

                    match operation {
                        0 => {
                            // Exact match - copy annotation as-is with same category
                            let mut pair_annotation = annotation.clone();
                            pair_annotation.id = annotation_id_counter;
                            annotation_id_counter += 1;
                            pair_annotations.push(pair_annotation);
                        }
                        1 => {
                            // Slight shift - move the annotation by a small amount but keep same category
                            let mut pair_annotation = annotation.clone();
                            pair_annotation.id = annotation_id_counter;
                            annotation_id_counter += 1;

                            // Shift bbox by different amounts based on match index
                            let base_shift = 10.0 + (match_idx as f64 * 5.0);
                            let shift_x = rng.gen_range(-base_shift..base_shift);
                            let shift_y = rng.gen_range(-base_shift..base_shift);

                            // Calculate actual shift applied after bounds checking
                            let original_x = annotation.bbox[0];
                            let original_y = annotation.bbox[1];

                            // Apply shift with bounds checking
                            pair_annotation.bbox[0] =
                                (pair_annotation.bbox[0] + shift_x).max(0.0).min(
                                    original_data.images[0].width as f64 - pair_annotation.bbox[2],
                                );
                            pair_annotation.bbox[1] =
                                (pair_annotation.bbox[1] + shift_y).max(0.0).min(
                                    original_data.images[0].height as f64 - pair_annotation.bbox[3],
                                );

                            let actual_shift_x = pair_annotation.bbox[0] - original_x;
                            let actual_shift_y = pair_annotation.bbox[1] - original_y;

                            // Also shift segmentation if present using actual shift amounts
                            if let Some(segmentation) = &mut pair_annotation.segmentation {
                                for polygon in segmentation.iter_mut() {
                                    for i in (0..polygon.len()).step_by(2) {
                                        polygon[i] += actual_shift_x;
                                        if i + 1 < polygon.len() {
                                            polygon[i + 1] += actual_shift_y;
                                        }
                                    }
                                }
                            }

                            // Recalculate area after transformation
                            pair_annotation.area =
                                pair_annotation.bbox[2] * pair_annotation.bbox[3];

                            pair_annotations.push(pair_annotation);
                        }
                        _ => unreachable!(),
                    }
                }
            }
            _ => unreachable!(),
        }
    }

    // Add additional annotations (FP) that don't exist in original
    for _ in 0..additional_count {
        // Create a new annotation at a random position
        let x = rng.gen_range(50.0..original_data.images[0].width as f64 - 100.0);
        let y = rng.gen_range(50.0..original_data.images[0].height as f64 - 100.0);
        let width = rng.gen_range(30.0..80.0);
        let height = rng.gen_range(30.0..80.0);

        let new_annotation = COCOAnnotation {
            id: annotation_id_counter,
            image_id: original_data.annotations[0].image_id,
            // category_idはrectangle固定とする
            category_id: 1, // Assuming category_id 1 is "rectangle"
            bbox: vec![x, y, width, height],
            area: width * height,
            segmentation: Some(vec![vec![
                x,
                y,
                x + width,
                y,
                x + width,
                y + height,
                x,
                y + height,
            ]]),
            iscrowd: 0,
            option: None,
            extra: HashMap::new(),
        };

        annotation_id_counter += 1;
        pair_annotations.push(new_annotation);
    }

    println!(
        "Generated {} pair annotations from {} original annotations",
        pair_annotations.len(),
        original_data.annotations.len()
    );

    // Debug: Check for category and shape consistency
    println!("Debug: Checking pair annotation consistency...");
    println!(
        "Perfect matches: {}, Partial matches: {}, No matches: {}, Additional: {}",
        perfect_match_count, partial_match_count, no_match_count, additional_count
    );

    let mut category_mismatches = 0;
    let mut shape_mismatches = 0;

    for (i, pair_ann) in pair_annotations.iter().enumerate() {
        // Only check the first perfect_match_count + partial_match_count annotations
        // as they should correspond to original annotations
        if i < perfect_match_count + partial_match_count && i < original_data.annotations.len() {
            let original_ann = &original_data.annotations[i];

            // Check category consistency
            if pair_ann.category_id != original_ann.category_id {
                category_mismatches += 1;
                println!(
                    "Warning: Category mismatch in annotation {} - original: {}, pair: {}",
                    i, original_ann.category_id, pair_ann.category_id
                );
            }

            // Check if both have segmentation or both don't
            let original_has_seg = original_ann.segmentation.is_some();
            let pair_has_seg = pair_ann.segmentation.is_some();
            if original_has_seg != pair_has_seg {
                shape_mismatches += 1;
                println!(
                    "Warning: Shape type mismatch in annotation {} - original has segmentation: {}, pair has segmentation: {}",
                    i, original_has_seg, pair_has_seg
                );
            }
        }
    }

    if category_mismatches == 0 && shape_mismatches == 0 {
        println!("✓ All matched annotations have consistent categories and shapes");
    } else {
        println!(
            "⚠ Found {} category mismatches and {} shape mismatches",
            category_mismatches, shape_mismatches
        );
    }

    // Create categories with modified names if requested
    let categories = if change_category_names {
        original_data
            .categories
            .iter()
            .map(|cat| COCOCategory {
                id: cat.id,
                name: format!("{}2", cat.name),
                supercategory: cat.supercategory.clone(),
                extra: cat.extra.clone(),
            })
            .collect()
    } else {
        original_data.categories.clone()
    };

    // Create a new COCO data structure with the modified annotations
    COCOData {
        info: original_data.info.clone(),
        images: original_data.images.clone(),
        annotations: pair_annotations,
        categories,
        licenses: original_data.licenses.clone(),
        extra: original_data.extra.clone(),
    }
}

#[allow(dead_code)]
fn generate_arrow_shape(
    rng: &mut rand::rngs::ThreadRng,
    width: u32,
    height: u32,
    category_id: i32,
    max_size: u32,
) -> Shape {
    let min_size = 40.min(max_size);
    let arrow_length = rng.gen_range(min_size..=max_size.min(100)) as f32;
    let arrow_width = arrow_length * 0.4;
    let head_size = arrow_length * 0.4;

    let center_x = rng.gen_range((arrow_length as u32)..(width - arrow_length as u32)) as f32;
    let center_y =
        rng.gen_range((arrow_width as u32 / 2)..(height - arrow_width as u32 / 2)) as f32;

    let segmentation = vec![
        (center_x - arrow_length / 2.0) as f64,
        (center_y - arrow_width / 4.0) as f64,
        (center_x + arrow_length / 2.0 - head_size) as f64,
        (center_y - arrow_width / 4.0) as f64,
        (center_x + arrow_length / 2.0 - head_size) as f64,
        (center_y - arrow_width / 2.0) as f64,
        (center_x + arrow_length / 2.0) as f64,
        center_y as f64,
        (center_x + arrow_length / 2.0 - head_size) as f64,
        (center_y + arrow_width / 2.0) as f64,
        (center_x + arrow_length / 2.0 - head_size) as f64,
        (center_y + arrow_width / 4.0) as f64,
        (center_x - arrow_length / 2.0) as f64,
        (center_y + arrow_width / 4.0) as f64,
    ];

    Shape {
        category_id,
        bbox: [
            (center_x - arrow_length / 2.0) as f64,
            (center_y - arrow_width / 2.0) as f64,
            arrow_length as f64,
            arrow_width as f64,
        ],
        segmentation,
        area: (arrow_length * arrow_width * 0.7) as f64, // Approximate area
    }
}

#[allow(dead_code)]
fn draw_arrow(img: &mut RgbImage, shape: &Shape, color: Rgb<u8>) {
    let center_x = shape.bbox[0] + shape.bbox[2] / 2.0;
    let center_y = shape.bbox[1] + shape.bbox[3] / 2.0;
    let arrow_length = shape.bbox[2];
    let arrow_width = shape.bbox[3];
    let head_size = arrow_length * 0.4;

    let points = vec![
        imageproc::point::Point::new(
            (center_x - arrow_length / 2.0) as i32,
            (center_y - arrow_width / 4.0) as i32,
        ),
        imageproc::point::Point::new(
            (center_x + arrow_length / 2.0 - head_size) as i32,
            (center_y - arrow_width / 4.0) as i32,
        ),
        imageproc::point::Point::new(
            (center_x + arrow_length / 2.0 - head_size) as i32,
            (center_y - arrow_width / 2.0) as i32,
        ),
        imageproc::point::Point::new((center_x + arrow_length / 2.0) as i32, center_y as i32),
        imageproc::point::Point::new(
            (center_x + arrow_length / 2.0 - head_size) as i32,
            (center_y + arrow_width / 2.0) as i32,
        ),
        imageproc::point::Point::new(
            (center_x + arrow_length / 2.0 - head_size) as i32,
            (center_y + arrow_width / 4.0) as i32,
        ),
        imageproc::point::Point::new(
            (center_x - arrow_length / 2.0) as i32,
            (center_y + arrow_width / 4.0) as i32,
        ),
    ];

    draw_polygon_mut(img, &points, color);
}

#[allow(dead_code)]
fn generate_rectangle_shape(
    rng: &mut rand::rngs::ThreadRng,
    width: u32,
    height: u32,
    category_id: i32,
    max_size: u32,
) -> Shape {
    let min_size = 40.min(max_size);
    let rect_width = rng.gen_range(min_size..=max_size.min(100));
    let rect_height = rng.gen_range(min_size..=max_size.min(100));
    let x = rng.gen_range(0..(width - rect_width));
    let y = rng.gen_range(0..(height - rect_height));

    let segmentation = vec![
        x as f64,
        y as f64,
        (x + rect_width) as f64,
        y as f64,
        (x + rect_width) as f64,
        (y + rect_height) as f64,
        x as f64,
        (y + rect_height) as f64,
    ];

    Shape {
        category_id,
        bbox: [x as f64, y as f64, rect_width as f64, rect_height as f64],
        segmentation,
        area: (rect_width * rect_height) as f64,
    }
}

#[allow(dead_code)]
fn draw_rectangle(img: &mut RgbImage, shape: &Shape, color: Rgb<u8>) {
    draw_filled_rect_mut(
        img,
        Rect::at(shape.bbox[0] as i32, shape.bbox[1] as i32)
            .of_size(shape.bbox[2] as u32, shape.bbox[3] as u32),
        color,
    );
}

#[allow(dead_code)]
fn generate_triangle_shape(
    rng: &mut rand::rngs::ThreadRng,
    width: u32,
    height: u32,
    category_id: i32,
    max_size: u32,
) -> Shape {
    let min_size = 40.min(max_size);
    let size = rng.gen_range(min_size..=max_size.min(80)) as f32;
    let center_x = rng.gen_range((size as u32)..(width - size as u32)) as f32;
    let center_y = rng.gen_range((size as u32)..(height - size as u32)) as f32;

    let segmentation = vec![
        center_x as f64,
        (center_y - size / 2.0) as f64,
        (center_x - size / 2.0) as f64,
        (center_y + size / 2.0) as f64,
        (center_x + size / 2.0) as f64,
        (center_y + size / 2.0) as f64,
    ];

    let bbox_x = (center_x - size / 2.0) as f64;
    let bbox_y = (center_y - size / 2.0) as f64;

    Shape {
        category_id,
        bbox: [bbox_x, bbox_y, size as f64, size as f64],
        segmentation,
        area: (size * size / 2.0) as f64,
    }
}

#[allow(dead_code)]
fn draw_triangle(img: &mut RgbImage, shape: &Shape, color: Rgb<u8>) {
    let center_x = shape.bbox[0] + shape.bbox[2] / 2.0;
    let center_y = shape.bbox[1] + shape.bbox[3] / 2.0;
    let size = shape.bbox[2];

    let points = vec![
        imageproc::point::Point::new(center_x as i32, (center_y - size / 2.0) as i32),
        imageproc::point::Point::new(
            (center_x - size / 2.0) as i32,
            (center_y + size / 2.0) as i32,
        ),
        imageproc::point::Point::new(
            (center_x + size / 2.0) as i32,
            (center_y + size / 2.0) as i32,
        ),
    ];

    draw_polygon_mut(img, &points, color);
}

#[allow(dead_code)]
fn generate_star_shape(
    rng: &mut rand::rngs::ThreadRng,
    width: u32,
    height: u32,
    category_id: i32,
    max_size: u32,
) -> Shape {
    let min_radius = 30.min(max_size / 2);
    let max_radius = (max_size / 2).min(60);
    let outer_radius = rng.gen_range(min_radius..=max_radius) as f32;
    let inner_radius = outer_radius * 0.5;
    let center_x = rng.gen_range((outer_radius as u32)..(width - outer_radius as u32)) as f32;
    let center_y = rng.gen_range((outer_radius as u32)..(height - outer_radius as u32)) as f32;

    let mut segmentation = Vec::new();

    for i in 0..10 {
        let angle = std::f32::consts::PI * i as f32 / 5.0 - std::f32::consts::PI / 2.0;
        let radius = if i % 2 == 0 {
            outer_radius
        } else {
            inner_radius
        };
        let x = center_x + radius * angle.cos();
        let y = center_y + radius * angle.sin();
        segmentation.push(x as f64);
        segmentation.push(y as f64);
    }

    Shape {
        category_id,
        bbox: [
            (center_x - outer_radius) as f64,
            (center_y - outer_radius) as f64,
            (outer_radius * 2.0) as f64,
            (outer_radius * 2.0) as f64,
        ],
        segmentation,
        area: (outer_radius * outer_radius) as f64,
    }
}

#[allow(dead_code)]
fn draw_star(img: &mut RgbImage, shape: &Shape, color: Rgb<u8>) {
    let center_x = shape.bbox[0] + shape.bbox[2] / 2.0;
    let center_y = shape.bbox[1] + shape.bbox[3] / 2.0;
    let outer_radius = shape.bbox[2] / 2.0;
    let inner_radius = outer_radius * 0.5;

    let mut points = Vec::new();

    for i in 0..10 {
        let angle = std::f32::consts::PI * i as f32 / 5.0 - std::f32::consts::PI / 2.0;
        let radius = if i % 2 == 0 {
            outer_radius
        } else {
            inner_radius
        };
        let x = center_x as f32 + radius as f32 * angle.cos();
        let y = center_y as f32 + radius as f32 * angle.sin();
        points.push(imageproc::point::Point::new(x as i32, y as i32));
    }

    draw_polygon_mut(img, &points, color);
}

#[allow(dead_code)]
fn hsl_to_rgb(h: f32, s: f32, l: f32) -> Rgb<u8> {
    let c = (1.0 - (2.0 * l - 1.0).abs()) * s;
    let x = c * (1.0 - ((h / 60.0) % 2.0 - 1.0).abs());
    let m = l - c / 2.0;

    let (r, g, b) = if h < 60.0 {
        (c, x, 0.0)
    } else if h < 120.0 {
        (x, c, 0.0)
    } else if h < 180.0 {
        (0.0, c, x)
    } else if h < 240.0 {
        (0.0, x, c)
    } else if h < 300.0 {
        (x, 0.0, c)
    } else {
        (c, 0.0, x)
    };

    Rgb([
        ((r + m) * 255.0) as u8,
        ((g + m) * 255.0) as u8,
        ((b + m) * 255.0) as u8,
    ])
}

#[allow(dead_code)]
fn generate_pentagon_shape(
    rng: &mut rand::rngs::ThreadRng,
    width: u32,
    height: u32,
    category_id: i32,
    max_size: u32,
) -> Shape {
    let min_radius = 30.min(max_size / 2);
    let max_radius = (max_size / 2).min(60);
    let radius = rng.gen_range(min_radius..=max_radius) as f32;
    let center_x = rng.gen_range((radius as u32)..(width - radius as u32)) as f32;
    let center_y = rng.gen_range((radius as u32)..(height - radius as u32)) as f32;

    let mut segmentation = Vec::new();

    for i in 0..5 {
        let angle = 2.0 * std::f32::consts::PI * i as f32 / 5.0 - std::f32::consts::PI / 2.0;
        let x = center_x + radius * angle.cos();
        let y = center_y + radius * angle.sin();
        segmentation.push(x as f64);
        segmentation.push(y as f64);
    }

    Shape {
        category_id,
        bbox: [
            (center_x - radius) as f64,
            (center_y - radius) as f64,
            (radius * 2.0) as f64,
            (radius * 2.0) as f64,
        ],
        segmentation,
        area: (radius * radius * 1.72) as f64,
    }
}

#[allow(dead_code)]
fn draw_pentagon(img: &mut RgbImage, shape: &Shape, color: Rgb<u8>) {
    let center_x = shape.bbox[0] + shape.bbox[2] / 2.0;
    let center_y = shape.bbox[1] + shape.bbox[3] / 2.0;
    let radius = shape.bbox[2] / 2.0;

    let mut points = Vec::new();

    for i in 0..5 {
        let angle = 2.0 * std::f32::consts::PI * i as f32 / 5.0 - std::f32::consts::PI / 2.0;
        let x = center_x as f32 + radius as f32 * angle.cos();
        let y = center_y as f32 + radius as f32 * angle.sin();
        points.push(imageproc::point::Point::new(x as i32, y as i32));
    }

    draw_polygon_mut(img, &points, color);
}

#[allow(dead_code)]
fn generate_hexagon_shape(
    rng: &mut rand::rngs::ThreadRng,
    width: u32,
    height: u32,
    category_id: i32,
    max_size: u32,
) -> Shape {
    let min_radius = 30.min(max_size / 2);
    let max_radius = (max_size / 2).min(60);
    let radius = rng.gen_range(min_radius..=max_radius) as f32;
    let center_x = rng.gen_range((radius as u32)..(width - radius as u32)) as f32;
    let center_y = rng.gen_range((radius as u32)..(height - radius as u32)) as f32;

    let mut segmentation = Vec::new();

    for i in 0..6 {
        let angle = 2.0 * std::f32::consts::PI * i as f32 / 6.0;
        let x = center_x + radius * angle.cos();
        let y = center_y + radius * angle.sin();
        segmentation.push(x as f64);
        segmentation.push(y as f64);
    }

    Shape {
        category_id,
        bbox: [
            (center_x - radius) as f64,
            (center_y - radius) as f64,
            (radius * 2.0) as f64,
            (radius * 2.0) as f64,
        ],
        segmentation,
        area: (radius * radius * 2.6) as f64,
    }
}

#[allow(dead_code)]
fn draw_hexagon(img: &mut RgbImage, shape: &Shape, color: Rgb<u8>) {
    let center_x = shape.bbox[0] + shape.bbox[2] / 2.0;
    let center_y = shape.bbox[1] + shape.bbox[3] / 2.0;
    let radius = shape.bbox[2] / 2.0;

    let mut points = Vec::new();

    for i in 0..6 {
        let angle = 2.0 * std::f32::consts::PI * i as f32 / 6.0;
        let x = center_x as f32 + radius as f32 * angle.cos();
        let y = center_y as f32 + radius as f32 * angle.sin();
        points.push(imageproc::point::Point::new(x as i32, y as i32));
    }

    draw_polygon_mut(img, &points, color);
}

#[allow(dead_code)]
fn generate_diamond_shape(
    rng: &mut rand::rngs::ThreadRng,
    width: u32,
    height: u32,
    category_id: i32,
    max_size: u32,
) -> Shape {
    let min_size = 40.min(max_size);
    let size = rng.gen_range(min_size..=max_size.min(80)) as f32;
    let center_x = rng.gen_range((size as u32)..(width - size as u32)) as f32;
    let center_y = rng.gen_range((size as u32)..(height - size as u32)) as f32;

    let segmentation = vec![
        center_x as f64,
        (center_y - size / 2.0) as f64,
        (center_x + size / 2.0) as f64,
        center_y as f64,
        center_x as f64,
        (center_y + size / 2.0) as f64,
        (center_x - size / 2.0) as f64,
        center_y as f64,
    ];

    Shape {
        category_id,
        bbox: [
            (center_x - size / 2.0) as f64,
            (center_y - size / 2.0) as f64,
            size as f64,
            size as f64,
        ],
        segmentation,
        area: (size * size / 2.0) as f64,
    }
}

#[allow(dead_code)]
fn draw_diamond(img: &mut RgbImage, shape: &Shape, color: Rgb<u8>) {
    let center_x = shape.bbox[0] + shape.bbox[2] / 2.0;
    let center_y = shape.bbox[1] + shape.bbox[3] / 2.0;
    let size = shape.bbox[2];

    let points = vec![
        imageproc::point::Point::new(center_x as i32, (center_y - size / 2.0) as i32),
        imageproc::point::Point::new((center_x + size / 2.0) as i32, center_y as i32),
        imageproc::point::Point::new(center_x as i32, (center_y + size / 2.0) as i32),
        imageproc::point::Point::new((center_x - size / 2.0) as i32, center_y as i32),
    ];

    draw_polygon_mut(img, &points, color);
}

#[allow(dead_code)]
fn generate_cross_shape(
    rng: &mut rand::rngs::ThreadRng,
    width: u32,
    height: u32,
    category_id: i32,
    max_size: u32,
) -> Shape {
    let min_size = 40.min(max_size);
    let size = rng.gen_range(min_size..=max_size.min(80)) as f32;
    let thickness = size / 3.0;
    let center_x = rng.gen_range((size as u32)..(width - size as u32)) as f32;
    let center_y = rng.gen_range((size as u32)..(height - size as u32)) as f32;

    // Create cross shape segmentation points in clockwise order
    // Starting from top-left of vertical bar
    let segmentation = vec![
        // Top of vertical bar
        (center_x - thickness / 2.0) as f64,
        (center_y - size / 2.0) as f64,
        (center_x + thickness / 2.0) as f64,
        (center_y - size / 2.0) as f64,
        // Right side of vertical bar to intersection
        (center_x + thickness / 2.0) as f64,
        (center_y - thickness / 2.0) as f64,
        // Right side of horizontal bar
        (center_x + size / 2.0) as f64,
        (center_y - thickness / 2.0) as f64,
        (center_x + size / 2.0) as f64,
        (center_y + thickness / 2.0) as f64,
        // Back to vertical bar intersection
        (center_x + thickness / 2.0) as f64,
        (center_y + thickness / 2.0) as f64,
        // Bottom of vertical bar
        (center_x + thickness / 2.0) as f64,
        (center_y + size / 2.0) as f64,
        (center_x - thickness / 2.0) as f64,
        (center_y + size / 2.0) as f64,
        // Left side of vertical bar to intersection
        (center_x - thickness / 2.0) as f64,
        (center_y + thickness / 2.0) as f64,
        // Left side of horizontal bar
        (center_x - size / 2.0) as f64,
        (center_y + thickness / 2.0) as f64,
        (center_x - size / 2.0) as f64,
        (center_y - thickness / 2.0) as f64,
        // Back to starting point
        (center_x - thickness / 2.0) as f64,
        (center_y - thickness / 2.0) as f64,
    ];

    Shape {
        category_id,
        bbox: [
            (center_x - size / 2.0) as f64,
            (center_y - size / 2.0) as f64,
            size as f64,
            size as f64,
        ],
        segmentation,
        area: (size * thickness * 2.0 - thickness * thickness) as f64,
    }
}

#[allow(dead_code)]
fn draw_cross(img: &mut RgbImage, shape: &Shape, color: Rgb<u8>) {
    // Convert segmentation points to imageproc points
    let mut points = Vec::new();
    for i in (0..shape.segmentation.len()).step_by(2) {
        points.push(imageproc::point::Point::new(
            shape.segmentation[i] as i32,
            shape.segmentation[i + 1] as i32,
        ));
    }

    draw_polygon_mut(img, &points, color);
}

#[allow(dead_code)]
fn generate_house_shape(
    rng: &mut rand::rngs::ThreadRng,
    width: u32,
    height: u32,
    category_id: i32,
    max_size: u32,
) -> Shape {
    let min_size = 40.min(max_size);
    let house_size = rng.gen_range(min_size..=max_size.min(100)) as f32;
    let wall_height = house_size * 0.6;
    let roof_height = house_size * 0.4;

    let center_x = rng.gen_range((house_size as u32 / 2)..(width - house_size as u32 / 2)) as f32;
    let center_y = rng.gen_range((house_size as u32 / 2)..(height - house_size as u32 / 2)) as f32;

    let segmentation = vec![
        (center_x - house_size / 2.0) as f64,
        center_y as f64,
        (center_x - house_size / 2.0) as f64,
        (center_y + wall_height / 2.0) as f64,
        (center_x + house_size / 2.0) as f64,
        (center_y + wall_height / 2.0) as f64,
        (center_x + house_size / 2.0) as f64,
        center_y as f64,
        center_x as f64,
        (center_y - roof_height) as f64,
    ];

    Shape {
        category_id,
        bbox: [
            (center_x - house_size / 2.0) as f64,
            (center_y - roof_height) as f64,
            house_size as f64,
            (wall_height / 2.0 + roof_height) as f64,
        ],
        segmentation,
        area: (house_size * wall_height / 2.0 + house_size * roof_height / 2.0) as f64,
    }
}

#[allow(dead_code)]
fn draw_house(img: &mut RgbImage, shape: &Shape, color: Rgb<u8>) {
    let center_x = shape.bbox[0] + shape.bbox[2] / 2.0;
    let center_y = shape.bbox[1] + shape.bbox[3] - shape.bbox[3] * 0.6 / 2.0;
    let house_size = shape.bbox[2];
    let wall_height = house_size * 0.6;
    let roof_height = house_size * 0.4;

    let points = vec![
        imageproc::point::Point::new((center_x - house_size / 2.0) as i32, center_y as i32),
        imageproc::point::Point::new(
            (center_x - house_size / 2.0) as i32,
            (center_y + wall_height / 2.0) as i32,
        ),
        imageproc::point::Point::new(
            (center_x + house_size / 2.0) as i32,
            (center_y + wall_height / 2.0) as i32,
        ),
        imageproc::point::Point::new((center_x + house_size / 2.0) as i32, center_y as i32),
        imageproc::point::Point::new(center_x as i32, (center_y - roof_height) as i32),
    ];

    draw_polygon_mut(img, &points, color);
}

#[allow(dead_code)]
fn generate_multi_polygon_segmentation(
    main_shape: &Shape,
    rng: &mut rand::rngs::ThreadRng,
    width: u32,
    height: u32,
    existing_shapes: &[Shape],
) -> Vec<Vec<f64>> {
    let mut segmentations = vec![main_shape.segmentation.clone()];

    // Calculate the smaller dimension of the main polygon
    let main_width = main_shape.bbox[2];
    let main_height = main_shape.bbox[3];
    let smaller_dimension = main_width.min(main_height);

    // Secondary polygon size: minimum of 10px or smaller dimension of main polygon
    let secondary_size = 10.0_f64.min(smaller_dimension);

    // Try to place 1-3 secondary polygons
    let num_secondary = rng.gen_range(1..=3);

    for _ in 0..num_secondary {
        // Try up to 10 times to place a secondary polygon
        for _ in 0..10 {
            // Generate position within 10px of main polygon bbox
            let margin = 10.0;
            let x = rng.gen_range(
                (main_shape.bbox[0] - margin).max(0.0)
                    ..(main_shape.bbox[0] + main_shape.bbox[2] + margin)
                        .min(width as f64 - secondary_size),
            );
            let y = rng.gen_range(
                (main_shape.bbox[1] - margin).max(0.0)
                    ..(main_shape.bbox[1] + main_shape.bbox[3] + margin)
                        .min(height as f64 - secondary_size),
            );

            // Create a simple square polygon
            let secondary_segmentation = vec![
                x,
                y,
                x + secondary_size,
                y,
                x + secondary_size,
                y + secondary_size,
                x,
                y + secondary_size,
            ];

            // Check if this would be within image bounds
            if x >= 0.0
                && y >= 0.0
                && x + secondary_size <= width as f64
                && y + secondary_size <= height as f64
            {
                // Check for overlap with existing shapes
                let secondary_bbox = [x, y, secondary_size, secondary_size];
                let overlaps = existing_shapes.iter().any(|s| {
                    let x1 = s.bbox[0];
                    let y1 = s.bbox[1];
                    let w1 = s.bbox[2];
                    let h1 = s.bbox[3];

                    let x2 = secondary_bbox[0];
                    let y2 = secondary_bbox[1];
                    let w2 = secondary_bbox[2];
                    let h2 = secondary_bbox[3];

                    !(x1 + w1 < x2 || x2 + w2 < x1 || y1 + h1 < y2 || y2 + h2 < y1)
                });

                if !overlaps {
                    segmentations.push(secondary_segmentation);
                    break;
                }
            }
        }
    }

    segmentations
}

#[allow(dead_code)]
fn calculate_combined_bbox(segmentations: &[Vec<f64>]) -> Vec<f64> {
    if segmentations.is_empty() {
        return vec![0.0, 0.0, 0.0, 0.0];
    }

    let mut min_x = f64::MAX;
    let mut min_y = f64::MAX;
    let mut max_x = f64::MIN;
    let mut max_y = f64::MIN;

    for segmentation in segmentations {
        for i in (0..segmentation.len()).step_by(2) {
            let x = segmentation[i];
            let y = segmentation[i + 1];

            min_x = min_x.min(x);
            min_y = min_y.min(y);
            max_x = max_x.max(x);
            max_y = max_y.max(y);
        }
    }

    vec![min_x, min_y, max_x - min_x, max_y - min_y]
}

#[allow(dead_code)]
fn generate_octagon_shape(
    rng: &mut rand::rngs::ThreadRng,
    width: u32,
    height: u32,
    category_id: i32,
    max_size: u32,
) -> Shape {
    let min_radius = 30.min(max_size / 2);
    let max_radius = (max_size / 2).min(60);
    let radius = rng.gen_range(min_radius..=max_radius) as f32;
    let center_x = rng.gen_range((radius as u32)..(width - radius as u32)) as f32;
    let center_y = rng.gen_range((radius as u32)..(height - radius as u32)) as f32;

    let mut segmentation = Vec::new();

    for i in 0..8 {
        let angle = 2.0 * std::f32::consts::PI * i as f32 / 8.0 - std::f32::consts::PI / 8.0;
        let x = center_x + radius * angle.cos();
        let y = center_y + radius * angle.sin();
        segmentation.push(x as f64);
        segmentation.push(y as f64);
    }

    Shape {
        category_id,
        bbox: [
            (center_x - radius) as f64,
            (center_y - radius) as f64,
            (radius * 2.0) as f64,
            (radius * 2.0) as f64,
        ],
        segmentation,
        area: (radius * radius * 2.83) as f64,
    }
}

#[allow(dead_code)]
fn draw_octagon(img: &mut RgbImage, shape: &Shape, color: Rgb<u8>) {
    let center_x = shape.bbox[0] + shape.bbox[2] / 2.0;
    let center_y = shape.bbox[1] + shape.bbox[3] / 2.0;
    let radius = shape.bbox[2] / 2.0;

    let mut points = Vec::new();

    for i in 0..8 {
        let angle = 2.0 * std::f32::consts::PI * i as f32 / 8.0 - std::f32::consts::PI / 8.0;
        let x = center_x as f32 + radius as f32 * angle.cos();
        let y = center_y as f32 + radius as f32 * angle.sin();
        points.push(imageproc::point::Point::new(x as i32, y as i32));
    }

    draw_polygon_mut(img, &points, color);
}
