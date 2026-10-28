# Another Static Site Generator (ASSG) - Architecture Blueprint

## 1. Core Tech Stack
* **Frontend:** Vanilla HTML, CSS, JavaScript (ES Modules)
* **Backend:** N/A (Static Site)
* **State Management:** Swup.js (Page transitions & routing state), Vanilla JS
* **Database/Storage:** Static JSON/JSON5 files (Build-time)
* **Media Storage:** S3-compatible bucket under `/media/*`, uploaded from the developer machine
* **Build Tool:** Vite (with custom Rollup/HTML plugins)
* **Deployment:** AWS S3 & CloudFront (via GitHub Actions)

## 2. Directory Structure (Domain-Driven Map)

```text
/
├── /.github                # CI/CD deployment workflows
├── /custom-vite-plugins    # Build-time injection, generation & media sync
├── /media                  # Local-only large media (uploaded to bucket)
├── /public                 # Static meta & SEO assets
└── /src                    # Source code
    ├── /assets             # Static data (JSON/JSON5) & build-processed images
    ├── /css                # Modular CSS (foundation, layouts, modules)
    ├── /js                 # Global logic, routing, lazy modules
    ├── /partials           # Reusable HTML fragments
    └── /[page-name]        # Page-specific HTML, CSS, and JS

```

## 3. Data Flow & State Management

* **Server-to-Client:** Data is fetched locally at build time. Custom Vite plugins (`static-data-builder.js`, `site-config-injector.js`) parse JSON/JSON5 files and `site.config.js`, injecting the content directly into HTML placeholders (`%%VARIABLES%%`).
* **Client State:** Minimal UI state is managed via Vanilla JS DOM manipulation (e.g., toggling CSS classes for tabs/accordions). Swup.js manages the active URL and container replacement.
* **Mutations:** Non-existent (Read-only static site). External data (like Instagram posts) is fetched asynchronously client-side via lazy-loaded modules when scrolled into view.

## 4. Core Orchestration (The Main Loop)

1. **Trigger:** User clicks a navigation link.
2. **Validation:** Swup.js intercepts the click, preventing a hard browser reload, and verifies the route.
3. **Execution:** Swup fetches the new HTML payload, animates the transition, and replaces the content of the `#swup` container.
4. **Resolution:** `app.js` triggers the unmount hook for the old page's JavaScript (running returned cleanup functions), updates the navigation active states, and mounts the new page's specific JS and `IntersectionObservers` for lazy-loading.

## 5. External Integrations

* **AWS S3 & CloudFront:** Automated static hosting and cache invalidation -> Handled in `/.github/workflows/deploy.yml` and `dev-deploy.yml`.
* **Behold (Instagram API):** Fetches the latest Instagram posts -> Handled in `/src/js/modules/insta-feed.js` (triggered via `VITE_INSTAGRAM_FEED_URL`).

## 6. Media Pipeline

* **Source:** Large media lives in `/media/`, is gitignored, and never enters the Vite graph. Reference it as `/media/...`, never hardcode the CDN host such as `https://assets.mydomain.com/media/...`.
* **Auto upload on local build:** Local `npm run build` / `build:dev` runs `aws s3 sync ./media s3://$MEDIA_BUCKET/media --endpoint-url $MEDIA_ENDPOINT_URL` before Vite.
    * It skips when media is absent, `CI=true`, or `MEDIA_SYNC=0`. 
    * It fails when `MEDIA_BUCKET`, `MEDIA_ENDPOINT_URL`, AWS CLI, or credentials are missing.
* **Manual upload:** CI (GH Workflows) and Docker builds never upload media. Run `aws s3 sync ./media s3://<bucket>/media --endpoint-url <endpoint>` from a machine with credentials, or copy files to `s3://<bucket>/media/`.
* **Dev reads:** `npm run dev` and `npm run preview` proxy `/media/*` to the media origin. Missing files fail locally (403/404 depending on origin). In Mode 1, builds keep `/media/...` root-absolute, so each environment resolves media from its configured origin root.
* **Env placement:** 
    * `MEDIA_BUCKET` lives in `.env.development` / `.env.production`.
    * `MEDIA_ORIGIN_URL`, `MEDIA_CDN_URL`, `MEDIA_ENDPOINT_URL`, and `MEDIA_SYNC` live in `.env`.
* **Deploy:** CI syncs `dist/` with `--delete --exclude "media/*"` and invalidates the CDN. Media is never uploaded by CI.

### Media modes

**Mode 1: Single bucket (default).** Media lives in the site bucket under `/media/*` and is served by the same host/CDN as the site.
* `MEDIA_ORIGIN_URL` only affects local dev/preview. Set it to the CDN origin for local dev until the custom domain is attached; leave empty to fall back to `SITE_URL`.
* Built URLs stay relative. This mode requires a bucket-backed host/CDN, e.g. AWS CloudFront + S3, Cloudflare R2 + Worker/custom domain, or any S3-compatible bucket behind a host/CDN.
* Static hosts that cannot expose bucket paths, e.g. Netlify or Vercel, need Mode 2.

**Mode 2: Separate CDN (simplest).** Set `MEDIA_CDN_URL` (e.g. `https://assets.mydomain.com`). 
* Builds rewrite `/media/...` to `<MEDIA_CDN_URL>/media/...`. Point `MEDIA_BUCKET` at the media bucket.
* Works with any site host. Use a browser-readable CDN URL; signed or authenticated media is not handled. Cross-origin fonts need CORS headers.

```text
Mode 1: /media/* -> MEDIA_ORIGIN_URL || SITE_URL -> site bucket /media/*
Mode 2: /media/* -> MEDIA_CDN_URL -> media bucket /media/*
```

**Notes:**
* `MEDIA_CDN_URL` takes precedence for build output and dev proxy.
* `MEDIA_ORIGIN_URL` is used when `MEDIA_CDN_URL` is empty.
* Auto-uploads always target `MEDIA_BUCKET`. `MEDIA_CDN_URL` does not disable auto-uploads. To disable, set `MEDIA_SYNC=0`.

## 7. CloudFront Deployment Notes

Required for multi-page sites on AWS CloudFront. An S3 REST origin does not serve `index.html` automatically. Associate this viewer-request CloudFront Function with the default cache behavior.

```js
function handler(event) {
    var request = event.request;
    var uri = request.uri;

    if (!uri.includes('.')) {
        if (uri.endsWith('/')) {
            request.uri = uri + 'index.html';
        } else {
            request.uri = uri + '/index.html';
        }
    }

    return request;
}
```

The dot check leaves `/media/*.jpg`, `/css/*.css`, and similar assets untouched. This makes DefaultRootObject unnecessary. Keep S3 Block Public Access enabled and grant CloudFront access through OAC and the bucket policy. CI invalidates the distribution after each deploy.

This section is AWS-specific; the media pipeline only needs an HTTP origin serving `/media/*`.
