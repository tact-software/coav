use tauri::menu::{Menu, MenuBuilder, MenuItem, PredefinedMenuItem, SubmenuBuilder};

pub fn create_menu(app: &tauri::AppHandle) -> Result<Menu<tauri::Wry>, Box<dyn std::error::Error>> {
    let menu = MenuBuilder::new(app)
        // File menu
        .item(
            &SubmenuBuilder::new(app, "File")
                .item(&MenuItem::with_id(
                    app,
                    "open_image",
                    "Open Image",
                    true,
                    Some("CmdOrCtrl+O"),
                )?)
                .item(&MenuItem::with_id(
                    app,
                    "open_annotations",
                    "Open Annotations",
                    true,
                    Some("CmdOrCtrl+Shift+O"),
                )?)
                .separator()
                .item(&MenuItem::with_id(
                    app,
                    "generate_sample",
                    "Generate Sample Data...",
                    true,
                    Some("CmdOrCtrl+G"),
                )?)
                .separator()
                .item(&MenuItem::with_id(
                    app,
                    "export_annotations",
                    "Export Annotations...",
                    true,
                    Some("CmdOrCtrl+S"),
                )?)
                .separator()
                .item(&PredefinedMenuItem::close_window(app, None)?)
                .build()?,
        )
        // View menu
        .item(
            &SubmenuBuilder::new(app, "View")
                .item(&MenuItem::with_id(
                    app,
                    "zoom_in",
                    "Zoom In",
                    true,
                    Some("CmdOrCtrl+Plus"),
                )?)
                .item(&MenuItem::with_id(
                    app,
                    "zoom_out",
                    "Zoom Out",
                    true,
                    Some("CmdOrCtrl+Minus"),
                )?)
                .item(&MenuItem::with_id(
                    app,
                    "zoom_fit",
                    "Fit to Window",
                    true,
                    Some("CmdOrCtrl+0"),
                )?)
                .item(&MenuItem::with_id(
                    app,
                    "zoom_100",
                    "Actual Size",
                    true,
                    Some("CmdOrCtrl+1"),
                )?)
                .separator()
                .item(&MenuItem::with_id(
                    app,
                    "toggle_annotations",
                    "Toggle Annotations",
                    true,
                    Some("CmdOrCtrl+H"),
                )?)
                .item(&MenuItem::with_id(
                    app,
                    "toggle_labels",
                    "Toggle Labels",
                    true,
                    Some("CmdOrCtrl+L"),
                )?)
                .item(&MenuItem::with_id(
                    app,
                    "toggle_bbox",
                    "Toggle Bounding Boxes",
                    true,
                    Some("CmdOrCtrl+B"),
                )?)
                .separator()
                .item(&PredefinedMenuItem::fullscreen(app, None)?)
                .build()?,
        )
        // Tools menu
        .item(
            &SubmenuBuilder::new(app, "Tools")
                .item(&MenuItem::with_id(
                    app,
                    "statistics",
                    "Statistics...",
                    true,
                    Some("CmdOrCtrl+I"),
                )?)
                .item(&MenuItem::with_id(
                    app,
                    "settings",
                    "Settings...",
                    true,
                    Some("CmdOrCtrl+,"),
                )?)
                .separator()
                .item(&MenuItem::with_id(
                    app,
                    "show_all_categories",
                    "Show All Categories",
                    true,
                    None::<&str>,
                )?)
                .item(&MenuItem::with_id(
                    app,
                    "hide_all_categories",
                    "Hide All Categories",
                    true,
                    None::<&str>,
                )?)
                .separator()
                .item(&MenuItem::with_id(
                    app,
                    "clear_data",
                    "Clear Data",
                    true,
                    None::<&str>,
                )?)
                .build()?,
        )
        // Window menu
        .item(
            &SubmenuBuilder::new(app, "Window")
                .item(&PredefinedMenuItem::minimize(app, None)?)
                .item(&PredefinedMenuItem::maximize(app, None)?)
                .separator()
                .item(&MenuItem::with_id(
                    app,
                    "toggle_sidebar",
                    "Toggle Sidebar",
                    true,
                    Some("CmdOrCtrl+\\"),
                )?)
                .build()?,
        )
        // Help menu
        .item(
            &SubmenuBuilder::new(app, "Help")
                .item(&MenuItem::with_id(
                    app,
                    "about",
                    "About COAV",
                    true,
                    None::<&str>,
                )?)
                .item(&MenuItem::with_id(
                    app,
                    "shortcuts",
                    "Keyboard Shortcuts",
                    true,
                    Some("CmdOrCtrl+/"),
                )?)
                .build()?,
        );

    let menu = menu.build()?;
    Ok(menu)
}
