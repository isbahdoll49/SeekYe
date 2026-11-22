use tauri::{Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
fn search_images(app: tauri::AppHandle, query: String) -> Result<(), String> {
    let query = query.trim().to_owned();
    if query.is_empty() || query.chars().count() > 300 {
        return Err("Query must be between 1 and 300 characters".into());
    }

    if let Some(previous) = app.get_webview_window("browser") {
        previous.close().map_err(|e| e.to_string())?;
    }

    let automation_query = query.clone();
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
        // Never grant this remote browser window Tauri command capabilities.
        url.scheme() == "https"
            && url.host_str().map(|host| host == "ya.ru" || host.ends_with(".ya.ru") || host == "yandex.ru" || host.ends_with(".yandex.ru") || host == "yandex.com" || host.ends_with(".yandex.com")).unwrap_or(false)
    })
    .on_page_load(move |window, payload| {
        if !matches!(payload.event(), tauri::webview::PageLoadEvent::Finished) {
            return;
        }
        let query_js = match serde_json::to_string(&automation_query) {
            Ok(v) => v,
            Err(_) => return,
        };
        let script = include_str!("automation.js").replace("__SEEKYE_QUERY_JSON__", &query_js);
        let _ = window.eval(script);
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
