# Contributing to Another Static Site Generator (ASSG)

This document outlines the architecture, conventions, and workflows for ASSG. Because this framework relies on a specific combination of Vite, Swup.js, and Vanilla JS, feel free to read this guide carefully to ensure that you can modify it to your own needs.

---

## 🏗️ Architecture Overview

ASSG is a "poor-man's Astro." It generates static HTML at build time but feels like a Single Page Application (SPA) on the client side.
* **Routing:** Handled by [Swup.js](https://swup.js.org/). It intercepts link clicks, fetches the new HTML, and replaces the `#swup` container without a full page reload.
* **JavaScript:** Vanilla ES Modules. No React, Vue, or heavy frameworks.
* **CSS:** Modular, native CSS utilizing CSS variables for theming.
* **Build Tool:** Vite, highly customized with local plugins to handle HTML partial injection, sitemap generation, and data binding.

---

## 📄 Adding a New Page

Pages are folder-based to ensure clean URLs (e.g., `/contact/index.html` becomes `yoursite.com/contact/`).

**Step-by-step:**
1. Create a new folder in `src/` (e.g., `src/contact/`).
2. Create an `index.html` file inside the new folder.
3. Use the `<load>` tag to inject the header, meta, and footer partials.
4. Ensure your main content is wrapped in `<main id="swup" data-page="contact">`.

**Example `src/contact/index.html`:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <load src="partials/meta.html" href="%%SITE_URL%%/contact" title="Contact Us | %%SITE_NAME%%" page="contact" />
</head>
<body>
    <load src="/partials/header.html" />

    <main id="swup" data-page="contact">
        </main>

    <load src="/partials/footer.html" />
</body>
</html>

```

---

## ⚡ Writing JavaScript (The Swup Lifecycle)

Because Swup dynamically replaces the DOM, standard `DOMContentLoaded` events only fire once (on the initial load).

If your new page requires specific JavaScript, you **MUST** follow this pattern:

1. Create a JS file matching your page name (e.g., `src/contact/contact.js`).
2. Export a `default` function that initializes your logic.
3. **CRITICAL:** That default function **MUST return a cleanup function** to remove event listeners and destroy instances when the user navigates away. If you skip this, you will create massive memory leaks.

**Example `src/contact/contact.js`:**

```javascript
export default function init() {
    const container = document.querySelector('#swup[data-page="contact"]');
    if (!container) return;

    const myButton = container.querySelector('#submit-btn');

    const handleClick = (e) => { console.log('Clicked!'); };
    myButton.addEventListener('click', handleClick);

    // Return the cleanup function!
    return function cleanup() {
        myButton.removeEventListener('click', handleClick);
    };
}

```

---

## ⏳ Lazy Loading Interactive Components (Hydration)

To keep the initial load blazing fast, heavy or interactive components (like carousels or API fetchers) should be lazy-loaded only when they scroll into view.

1. Add `data-lazy-module="your-module-name"` to your HTML element.
2. Create `src/js/modules/your-module-name.js`.
3. Create `src/css/modules/your-module-name.css` for custom css dedicated for the module.
4. Export a default function that takes the DOM element as its parameter.

**HTML:**

```html
<div data-lazy-module="pricing-calculator">
    </div>

```

**JavaScript (`src/js/modules/pricing-calculator.js`):**

```javascript
import "../../css/modules/pricing-calculator.css";

export default function init(element) {
    // This code only downloads and runs when the element enters the viewport
    element.innerHTML = '<button>Calculate</button>';
}

```

---

## 🔌 Working with Custom Vite Plugins & Data

ASSG uses custom Vite plugins (located in `custom-vite-plugins/`) to inject static data into HTML at build time.

If you need to inject data from a JSON/JSON5 file into a page:

1. Place your data file in `src/assets/data/` (e.g., `features.json`).
2. Add a `%%PLACEHOLDER%%` in your HTML.
3. Open `custom-vite-plugins/static-data-injections.config.js`.
4. Add a new configuration block detailing the target page, the placeholder, the data path, and a renderer function to generate the HTML string.

---

## 🛑 Guardrails & Code Quality

To test the final production build locally, run:

```bash
./local-build.sh

```

This will generate a `dist/` folder identical to what the CI/CD pipeline deploys. Serve this folder with a local web server to verify everything works post-minification.
