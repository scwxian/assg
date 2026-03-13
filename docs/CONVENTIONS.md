# Another Static Site Generator (ASSG) - Coding Conventions & Guardrails

## 1. Environment Constraints
* **Runtime:** This is a purely Static Site Generator using Node.js (v20+) strictly for the Vite build step. NEVER use Node built-ins in client-side code.
* **Language:** Vanilla JavaScript (ESM) and standard HTML/CSS. NEVER use TypeScript, JSX, or heavy frontend frameworks (React, Vue, Svelte, etc.).

## 2. Frontend Rules
* **Component Paradigm:** ALWAYS use semantic HTML with `vite-plugin-html-inject` (`<load src="..." />`) for reusable partials. NEVER use client-side rendering for layout components.
* **Styling:** ALWAYS use native, modular CSS imported into `styles.css`. NEVER use Tailwind, Bootstrap, or CSS-in-JS. ALWAYS utilize CSS variables (`var(--theme-color)`) defined in `theme.css` for styling.
* **Performance/Hydration:** ALWAYS lazy-load interactive JavaScript modules. NEVER attach heavy scripts directly to the initial page load. ALWAYS use `data-lazy-module="module-name"` and rely on `main.js`'s `IntersectionObserver` to trigger execution.
* **Page Transitions:** ALWAYS structure page-specific JS to return a cleanup function. NEVER leave stray event listeners when Swup replaces the `#swup` container.

## 3. Backend & API Rules
* **Data Sourcing:** ALWAYS place static content data in `src/assets/data/` as `.json` or `.json5` files. NEVER hardcode extensive content directly in HTML.
* **Data Injection:** ALWAYS map static data sources and HTML placeholders within `custom-vite-plugins/static-data-injections.config.js`.
* **Error Handling (Client APIs):** ALWAYS provide fallback HTML/UI for client-side fetches (e.g., if the Behold Instagram API fails). NEVER let a failed fetch break the page layout.

## 4. Domain-Specific Rules
* **Global Variables:** ALWAYS define site-wide constants (URLs, Names, SEO descriptions) in `site.config.js`. ALWAYS use the `%%VARIABLE_NAME%%` syntax in HTML for injection.
* **SEO Management:** NEVER manually update `sitemap.xml` or `robots.txt`. ALWAYS let `sitemap-generator.js` generate them dynamically based on the HTML entries discovered during the Vite build.

## 5. Naming Conventions
* **Files & Directories:** ALWAYS use `kebab-case` (e.g., `insta-feed.js`, `privacy-policy/`, `apple-touch-icon.png`).
* **Variables & Functions:** ALWAYS use `camelCase` in JavaScript (e.g., `initAccordionAnimations`, `dialogueState`).
* **CSS Classes:** ALWAYS use `kebab-case` and prefer utility or BEM-lite descriptors (e.g., `section-subtitle`, `card-layout-wrapper`).
