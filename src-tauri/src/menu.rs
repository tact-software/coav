use tauri::menu::{Menu, MenuBuilder, MenuItem, PredefinedMenuItem, SubmenuBuilder};

/// Menu translations for different languages
pub struct MenuLabels {
    // Submenu titles
    pub file: &'static str,
    pub view: &'static str,
    pub tools: &'static str,
    pub window: &'static str,
    pub help: &'static str,
    // File menu
    pub open_image: &'static str,
    pub open_annotations: &'static str,
    pub generate_sample: &'static str,
    pub export_annotations: &'static str,
    // View menu
    pub zoom_in: &'static str,
    pub zoom_out: &'static str,
    pub fit_to_window: &'static str,
    pub actual_size: &'static str,
    pub toggle_annotations: &'static str,
    pub toggle_labels: &'static str,
    pub toggle_bounding_boxes: &'static str,
    // Tools menu
    pub compare: &'static str,
    pub statistics: &'static str,
    pub histogram: &'static str,
    pub heatmap: &'static str,
    pub settings: &'static str,
    pub show_all_categories: &'static str,
    pub hide_all_categories: &'static str,
    pub clear_data: &'static str,
    // Window menu
    pub toggle_sidebar: &'static str,
    // Help menu
    pub about: &'static str,
    pub shortcuts: &'static str,
}

impl MenuLabels {
    pub fn japanese() -> Self {
        Self {
            file: "ファイル",
            view: "表示",
            tools: "ツール",
            window: "ウィンドウ",
            help: "ヘルプ",
            open_image: "画像を開く",
            open_annotations: "アノテーションを開く",
            generate_sample: "サンプルデータを生成...",
            export_annotations: "アノテーションをエクスポート...",
            zoom_in: "拡大",
            zoom_out: "縮小",
            fit_to_window: "ウィンドウに合わせる",
            actual_size: "原寸大",
            toggle_annotations: "アノテーションの表示/非表示",
            toggle_labels: "ラベルの表示/非表示",
            toggle_bounding_boxes: "バウンディングボックスの表示/非表示",
            compare: "アノテーションを比較...",
            statistics: "統計情報...",
            histogram: "分布ヒストグラム...",
            heatmap: "2Dヒートマップ...",
            settings: "設定...",
            show_all_categories: "すべてのカテゴリを表示",
            hide_all_categories: "すべてのカテゴリを非表示",
            clear_data: "データをクリア",
            toggle_sidebar: "サイドバーを切り替え",
            about: "COAVについて",
            shortcuts: "キーボードショートカット",
        }
    }

    pub fn english() -> Self {
        Self {
            file: "File",
            view: "View",
            tools: "Tools",
            window: "Window",
            help: "Help",
            open_image: "Open Image",
            open_annotations: "Open Annotations",
            generate_sample: "Generate Sample Data...",
            export_annotations: "Export Annotations...",
            zoom_in: "Zoom In",
            zoom_out: "Zoom Out",
            fit_to_window: "Fit to Window",
            actual_size: "Actual Size",
            toggle_annotations: "Toggle Annotations",
            toggle_labels: "Toggle Labels",
            toggle_bounding_boxes: "Toggle Bounding Boxes",
            compare: "Compare Annotations...",
            statistics: "Statistics...",
            histogram: "Distribution Histogram...",
            heatmap: "2D Heatmap...",
            settings: "Settings...",
            show_all_categories: "Show All Categories",
            hide_all_categories: "Hide All Categories",
            clear_data: "Clear Data",
            toggle_sidebar: "Toggle Sidebar",
            about: "About COAV",
            shortcuts: "Keyboard Shortcuts",
        }
    }

    pub fn from_language(lang: &str) -> Self {
        match lang {
            "ja" => Self::japanese(),
            _ => Self::english(),
        }
    }
}

pub fn create_menu_with_language(app: &tauri::AppHandle, lang: &str) -> Result<Menu<tauri::Wry>, Box<dyn std::error::Error>> {
    let l = MenuLabels::from_language(lang);
    let menu = MenuBuilder::new(app)
        // File menu
        .item(
            &SubmenuBuilder::new(app, l.file)
                .item(&MenuItem::with_id(app, "open_image", l.open_image, true, Some("CmdOrCtrl+O"))?)
                .item(&MenuItem::with_id(app, "open_annotations", l.open_annotations, true, Some("CmdOrCtrl+Shift+O"))?)
                .separator()
                .item(&MenuItem::with_id(app, "generate_sample", l.generate_sample, true, Some("CmdOrCtrl+G"))?)
                .separator()
                .item(&MenuItem::with_id(app, "export_annotations", l.export_annotations, true, Some("CmdOrCtrl+S"))?)
                .separator()
                .item(&PredefinedMenuItem::close_window(app, None)?)
                .build()?,
        )
        // View menu
        .item(
            &SubmenuBuilder::new(app, l.view)
                .item(&MenuItem::with_id(app, "zoom_in", l.zoom_in, true, Some("CmdOrCtrl+Plus"))?)
                .item(&MenuItem::with_id(app, "zoom_out", l.zoom_out, true, Some("CmdOrCtrl+Minus"))?)
                .item(&MenuItem::with_id(app, "zoom_fit", l.fit_to_window, true, Some("CmdOrCtrl+0"))?)
                .item(&MenuItem::with_id(app, "zoom_100", l.actual_size, true, Some("CmdOrCtrl+1"))?)
                .separator()
                .item(&MenuItem::with_id(app, "toggle_annotations", l.toggle_annotations, true, Some("CmdOrCtrl+H"))?)
                .item(&MenuItem::with_id(app, "toggle_labels", l.toggle_labels, true, Some("CmdOrCtrl+L"))?)
                .item(&MenuItem::with_id(app, "toggle_bbox", l.toggle_bounding_boxes, true, Some("CmdOrCtrl+B"))?)
                .separator()
                .item(&PredefinedMenuItem::fullscreen(app, None)?)
                .build()?,
        )
        // Tools menu
        .item(
            &SubmenuBuilder::new(app, l.tools)
                .item(&MenuItem::with_id(app, "compare", l.compare, true, Some("CmdOrCtrl+D"))?)
                .separator()
                .item(&MenuItem::with_id(app, "statistics", l.statistics, true, Some("CmdOrCtrl+I"))?)
                .item(&MenuItem::with_id(app, "histogram", l.histogram, true, Some("CmdOrCtrl+Shift+H"))?)
                .item(&MenuItem::with_id(app, "heatmap", l.heatmap, true, Some("CmdOrCtrl+Shift+M"))?)
                .separator()
                .item(&MenuItem::with_id(app, "settings", l.settings, true, Some("CmdOrCtrl+,"))?)
                .separator()
                .item(&MenuItem::with_id(app, "show_all_categories", l.show_all_categories, true, None::<&str>)?)
                .item(&MenuItem::with_id(app, "hide_all_categories", l.hide_all_categories, true, None::<&str>)?)
                .separator()
                .item(&MenuItem::with_id(app, "clear_data", l.clear_data, true, None::<&str>)?)
                .build()?,
        )
        // Window menu
        .item(
            &SubmenuBuilder::new(app, l.window)
                .item(&PredefinedMenuItem::minimize(app, None)?)
                .item(&PredefinedMenuItem::maximize(app, None)?)
                .separator()
                .item(&MenuItem::with_id(app, "toggle_sidebar", l.toggle_sidebar, true, Some("CmdOrCtrl+\\"))?)
                .build()?,
        )
        // Help menu
        .item(
            &SubmenuBuilder::new(app, l.help)
                .item(&MenuItem::with_id(app, "about", l.about, true, None::<&str>)?)
                .item(&MenuItem::with_id(app, "shortcuts", l.shortcuts, true, Some("CmdOrCtrl+/"))?)
                .build()?,
        );

    let menu = menu.build()?;
    Ok(menu)
}
