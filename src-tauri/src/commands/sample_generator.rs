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

#[derive(Debug)]
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
    pub class_count: Option<u32>,
    pub annotation_count: Option<u32>,
    pub filename: Option<String>,
    pub max_object_size: Option<u32>,
    pub allow_overlap: Option<bool>,
    pub include_licenses: Option<bool>,
    pub include_option: Option<bool>,
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

        // Generate color based on category ID using HSL
        let hue = (category_id - 1) as f32 * 360.0 / num_classes as f32;
        let color = hsl_to_rgb(hue, 0.7, 0.6);

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
    let image_filename = format!("{}-image.png", base_filename);
    let image_path = Path::new(&output_dir).join(&image_filename);
    img.save(&image_path)
        .map_err(|e| format!("Failed to save image: {}", e))?;

    // Store the actual number of annotations before moving shapes
    let actual_annotations = shapes.len();

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
        images: vec![COCOImage {
            id: 1,
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
        }],
        annotations: shapes
            .into_iter()
            .enumerate()
            .map(|(i, shape)| {
                let option = if option_template.is_some() {
                    Some(generate_option_for_annotation(&mut rng))
                } else {
                    None
                };

                COCOAnnotation {
                    id: (i + 1) as i64,
                    image_id: 1,
                    category_id: shape.category_id,
                    segmentation: Some(vec![shape.segmentation]),
                    area: shape.area,
                    bbox: shape.bbox.to_vec(),
                    iscrowd: 0,
                    option,
                    extra: HashMap::new(),
                }
            })
            .collect(),
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

    let message = if actual_annotations < num_annotations as usize {
        format!(
            "Sample data generated in {} with {} classes and {} annotations (requested: {}, limited by space constraints)",
            output_dir, num_classes, actual_annotations, num_annotations
        )
    } else {
        format!(
            "Sample data generated successfully in {} with {} classes and {} annotations",
            output_dir, num_classes, actual_annotations
        )
    };
    Ok(message)
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
