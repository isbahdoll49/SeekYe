(() => {
  const query = __SEEKYE_QUERY_JSON__;
  const host = location.hostname;
  const isImages = /\/images\//.test(location.pathname);
  const target = 'https://yandex.ru/images/search?text=' + encodeURIComponent(query);
  const report = (images, error) => {
    if (window.__seekyeReported) return;
    window.__seekyeReported = true;
    const data = { query, images, pageUrl: location.href, ...(error ? {error} : {}) };
    // Local scheme is intercepted and cancelled by Rust. No remote Tauri IPC exposure.
    location.href = 'seekye-results://done/?payload=' + encodeURIComponent(JSON.stringify(data));
  };
  if (!isImages) {
    if (window.__seekyeStarting) return;
    window.__seekyeStarting = true;
    // Exercise the visible search field and button on ya.ru before opening Images.
    const input = document.querySelector('input[name="text"],input[name="query"],input[type="search"]');
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
      setter.call(input, query);
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }
    setTimeout(() => {
      const imagesLink = Array.from(document.querySelectorAll('a[href]')).find(a => /\/images\//.test(a.getAttribute('href') || '') && /картин|images/i.test(a.textContent || a.getAttribute('aria-label') || ''));
      if (imagesLink) {
        const u = new URL(imagesLink.href, location.href); u.searchParams.set('text', query);
        location.assign(u.toString());
      } else location.assign(target);
    }, 700);
    return;
  }

  const absolutize = value => {
    if (!value || typeof value !== 'string') return '';
    try { const url = new URL(value, location.href); return ['https:','http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
  };
  const seen = new Set();
  function normalize(item) {
    if (!item || typeof item !== 'object') return null;
    const b = item['serp-item'] || item;
    const raw = b.thumb && (b.thumb.url || b.thumb);
    const thumb = absolutize(raw || b.thumbnail || b.preview?.[0]?.url || b.preview?.[0]?.src || b.img_href);
    if (!thumb || seen.has(thumb)) return null;
    seen.add(thumb);
    return { thumbnail:thumb, original:absolutize(b.img_href || b.origUrl || b.original || thumb), title:String(b.snippet?.title || b.title || '').slice(0,160), source:String(b.snippet?.domain || b.snippet?.url || '').slice(0,160), width:Number(b.thumb?.size?.width || b.preview?.[0]?.w || 0),height:Number(b.thumb?.size?.height || b.preview?.[0]?.h || 0) };
  }
  function collect() {
    const images=[];
    document.querySelectorAll('[data-bem],[data-state]').forEach(el => {
      if(images.length>=60)return;
      for(const key of ['data-bem','data-state']) {
        const raw = el.getAttribute(key);
        if(!raw || raw.length > 1500000) continue;
        try {
          const parsed = JSON.parse(raw);
          const candidates = key === 'data-bem' ? [parsed['serp-item'] || parsed] : Array.isArray(parsed) ? parsed : [parsed];
          for(const candidate of candidates) {const value=normalize(candidate); if(value) images.push(value);}
        } catch {}
      }
    });
    if (images.length < 5) {
      document.querySelectorAll('.serp-item img, .serp-list img, [class*="serp-item"] img, [class*="ImagesContent"] img').forEach(img => {
        if(images.length>=60)return;
        const thumbnail=absolutize(img.currentSrc || img.src || img.getAttribute('data-src'));
        if(!thumbnail || seen.has(thumbnail))return;
        seen.add(thumbnail);
        images.push({thumbnail,original:thumbnail,title:img.alt || '',source:'',width:img.naturalWidth || 0,height:img.naturalHeight || 0});
      });
    }
    return images;
  }
  let count=0;
  const poll=()=>{
    seen.clear();
    const images=collect();
    if(images.length>=8 || (images.length>0 && count>=8))return report(images);
    if(++count>=24) {
      const text=(document.body?.innerText || '').slice(0,1200);
      report(images,images.length ? undefined : (/captcha|робот|подтвердите|smartcaptcha/i.test(text) ? 'Yandex requires a human verification in the browser window. Complete it and search again.' : 'No image tiles could be parsed. Yandex may have changed the DOM or blocked this session.'));
      return;
    }
    setTimeout(poll,750);
  };
  setTimeout(poll,1200);
})();
