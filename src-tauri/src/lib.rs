mod commands;
mod menu;
mod models;

use commands::{load_annotations, load_image, sample_generator::generate_sample_data, scan_folder};
use menu::create_menu;
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            load_annotations,
            load_image,
            scan_folder,
            generate_sample_data
        ])
        .setup(|app| {
            let handle = app.handle();
            let menu = create_menu(handle)?;
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
