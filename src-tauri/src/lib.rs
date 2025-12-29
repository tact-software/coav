mod commands;
mod menu;
mod models;

use commands::{
    load_annotations, load_image, sample_generator::generate_sample_data, save_annotations,
    scan_folder,
};
use menu::create_menu_with_language;
use tauri::{Emitter, Manager};

/// Command to update menu language
#[tauri::command]
fn set_menu_language(app: tauri::AppHandle, language: String) -> Result<(), String> {
    let menu = create_menu_with_language(&app, &language).map_err(|e| e.to_string())?;
    app.set_menu(menu).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            load_annotations,
            load_image,
            save_annotations,
            scan_folder,
            generate_sample_data,
            set_menu_language
        ])
        .setup(|app| {
            let handle = app.handle();
            // Default to Japanese menu
            let menu = create_menu_with_language(handle, "ja")?;
            app.set_menu(menu)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            let window = app.get_webview_window("main").unwrap();
            window
                .emit(&format!("menu-{}", event.id().as_ref()), ())
                .unwrap();
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
