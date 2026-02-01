'use strict';

// Helper Functions
// lazy loading module to simulate "Hydration" like modern sites

const modulesList = import.meta.glob('./modules/*.js');

async function loadLazyModule(element) {
    const moduleName = element.dataset.lazyModule;
    if (!moduleName) return;

    const modulePath = `./modules/${moduleName}.js`;
    const moduleLoader = modulesList[modulePath];

    if (!moduleLoader) {
        console.warn(`[LazyLoad] Module not found: ${modulePath}`);
        return;
    }

    try {
        const module = await moduleLoader();
        if (module.default) {
            module.default(element);
        } else {
            console.warn(`[LazyLoad] Module ${moduleName} does not have a default export.`);
        }
    } catch (e) {
        console.error(`Failed to lazy-load module: ${moduleName}`, e);
    }
}

export function initPersistent() {

    // --- Define all DOM Elements ---
    // Footer Dynamic Year
    const body = document.body;
    const yearText = document.getElementById('copyright-year');
    // Mobile Nav Sidebar
    const nav = document.querySelector('.nav-links');
    const navToggle = document.querySelector('.mobile-nav-toggle');
    const navClose = document.querySelector('.mobile-nav-close');
    // Mobile Scroll To Top Button
    const scrollTopButton = document.getElementById("scrollToTop");
    const isMobile = window.innerWidth <= 1020;

    // --- Modules ---

    // --- Core Functions ---
    // Global Data Imoprter for both yaml and json
    const rawData = import.meta.glob('../assets/data/*.{json,yaml}', {
        eager: true,
        query: '?url',
        import: 'default'
    });

    const dataRegistry = Object.keys(rawData).reduce((acc, path) => {
        const lookupKey = path;
        const finalUrl = rawData[path].replace(/\.yaml$/, '.json');
        acc[lookupKey] = finalUrl;
        return acc;
    }, {});

    window.getDataUrl = (filename) => {
        const lookupKey = `../assets/data/${filename}`;
        const finalUrl = dataRegistry[lookupKey];

        if (!finalUrl) {
            console.warn(`[Global Data] File "${filename}" not found in src/assets/data/.`);
            console.debug('Available data files:', Object.keys(dataRegistry));
            return null;
        }
        return finalUrl;
    };

    // Updates the copyright year in the footer.
    if (yearText) { yearText.textContent = new Date().getFullYear(); }

    // Add Accent Bg to Sticky Header on Desktop when scrolled
    if (!isMobile) {
        window.addEventListener('scroll', () => {
            document.querySelector('header').classList.toggle('is-scrolled', window.scrollY > 20);
        });
    }

    // Mobile Nav Sidebar
    if (nav && navToggle && navClose) {
        const openNav = () => {
            nav.setAttribute('data-visible', true);
            navToggle.setAttribute('aria-expanded', true);
            navToggle.classList.add('nav-open');
        };
        const closeNav = () => {
            nav.setAttribute('data-visible', false);
            navToggle.setAttribute('aria-expanded', false);
            navToggle.classList.remove('nav-open');
        };

        navToggle.addEventListener('click', (e) => {
            const isVisible = nav.getAttribute('data-visible') === 'true';
            if (isVisible) { closeNav();
            } else { openNav(); }
        });

        navClose.addEventListener('click', closeNav);

        nav.addEventListener('click', (e) => {
            if (e.target.closest('a')) { closeNav(); }
        });

        document.addEventListener('click', (e) => {
            if (nav.getAttribute('data-visible') !== 'true') { return; }

            const isInsideNav = nav.contains(e.target);
            const isToggle = e.target.closest('.mobile-nav-toggle');

            if (!isInsideNav && !isToggle) { closeNav(); }
        });
    }


    // Mobile Scroll To Top Buttion
    if (scrollTopButton) {
        const handleScroll = () => {
            const scrollPosition = document.body.scrollTop || document.documentElement.scrollTop;

            if (scrollPosition > 100 && isMobile) {
                scrollTopButton.style.display = "block";
            } else {
                scrollTopButton.style.display = "none";
            }
        };

        const scrollToTop = () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        window.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleScroll);
        scrollTopButton.addEventListener('click', scrollToTop);
        handleScroll();
    }


}

export function initPage() {

    // --- Define all DOM Elements ---
    // Scroll Actions (Animate Elements or Lazy Load Modules when almost in view)
    const observedElements = document.querySelectorAll('.animate-element, [data-lazy-module]');

    if (observedElements.length > 0) {

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = entry.target;

                    if (target.classList.contains('animate-element')) {
                        target.classList.add('is-visible');
                    }

                    if (target.dataset.lazyModule) {
                        loadLazyModule(target);
                    }
                    observer.unobserve(target);
                }
            });
        }, { threshold: 0.2, });

        observedElements.forEach(element => {
            observer.observe(element);
        });
    }

}
