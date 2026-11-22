use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
async fn search_images(app: tauri::AppHandle, query: String) -> Result<(), String> {
    let query = query.trim().to_owned();
    if query.is_empty() || query.chars().count() > 300 {
        return Err("Query must be between 1 and 300 characters".into());
    }

    if let Some(previous) = app.get_webview_window("browser") {
        previous.close().map_err(|e| e.to_string())?;
    }

    let automation_query = query.clone();
    let _ = app.emit("seekye:status", "Opening Yandex in the native browser...");
    let events_app = app.clone();
    WebviewWindowBuilder::new(
        &app,
        "browser",
        WebviewUrl::External("https://ya.ru/".parse().map_err(|e: url::ParseError| e.to_string())?),
    )
    .title("SeekYe Browser | Yandex")
    .inner_size(1050.0, 780.0)
    .on_navigation(move |url| {
        if url.scheme() == "seekye-results" {
            if let Some((_, value)) = url.query_pairs().find(|(name, _)| name == "payload") {
                if let Ok(payload) = serde_json::from_str::<serde_json::Value>(&value) {
                    let _ = events_app.emit("seekye:results", payload);
                }
            }
            return false;
        }
        // WebView2 starts at about:blank on Windows. Blocking that navigation can
        // leave a white browser window before the requested URL loads.
        // Remote pages never receive Tauri IPC capabilities (only `main` does).
        // Allow HTTPS redirects, including regional Yandex domains and consent
        // pages; the separate browser is intentionally an interactive browser.
        matches!(url.scheme(), "https" | "http")
            || (url.scheme() == "about" && url.path() == "blank")
    })
    .on_page_load(move |window, payload| {
        let current_url = payload.url().to_string();
        let _ = window.app_handle().emit("seekye:status", format!("Browser loaded: {current_url}"));
        if !matches!(payload.event(), tauri::webview::PageLoadEvent::Finished)
            || !matches!(payload.url().scheme(), "http" | "https") {
            return;
        }
        let query_js = match serde_json::to_string(&automation_query) {
            Ok(v) => v,
            Err(_) => return,
        };
        let script = include_str!("automation.js").replace("__SEEKYE_QUERY_JSON__", &query_js);
        if let Err(error) = window.eval(script) {
            let _ = window.app_handle().emit("seekye:status", format!("Automation injection failed: {error}"));
        }
    })
    .build()
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![search_images])
        .run(tauri::generate_context!())
        .expect("error while running SeekYe");
}
