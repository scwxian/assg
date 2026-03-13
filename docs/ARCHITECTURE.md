# Another Static Site Generator (ASSG) - Architecture Blueprint

## 1. Core Tech Stack
* **Frontend:** Vanilla HTML, CSS, JavaScript (ES Modules)
* **Backend:** N/A (Static Site)
* **State Management:** Swup.js (Page transitions & routing state), Vanilla JS
* **Database/Storage:** Static JSON/JSON5 files (Build-time)
* **Build Tool:** Vite (with custom Rollup/HTML plugins)
* **Deployment:** AWS S3 & CloudFront (via GitHub Actions)

## 2. Directory Structure (Domain-Driven Map)

```text
/
├── /.github                # CI/CD deployment workflows
├── /custom-vite-plugins    # Build-time injection & generation
├── /public                 # Static meta & SEO assets
└── /src                    # Source code
    ├── /assets             # Static data (JSON/JSON5) & media
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
