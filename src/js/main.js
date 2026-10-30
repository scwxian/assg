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
    const header = document.querySelector('body > header');
    const nav = header?.querySelector('.nav-links');
    const navToggle = header?.querySelector('.mobile-nav-toggle');
    const navClose = header?.querySelector('.mobile-nav-close');
    const navBackdrop = document.getElementById('nav-backdrop');
    const logoLink = header?.querySelector('#logo');
    const dropdowns = header ? [...header.querySelectorAll('.nav-dropdown')] : [];
    // Mobile Scroll To Top Button
    const scrollTopButton = document.getElementById("scrollToTop");

    // Breakpoint state is read live so resizing never goes stale
    const desktopQuery = window.matchMedia('(min-width: 1021px)');
    const isDesktop = () => desktopQuery.matches;

    // --- Modules ---

    // --- Core Functions ---
    // Global Data Imoprter for json and json5 files
    const rawData = import.meta.glob('../assets/data/*.{json,json5}', {
        eager: true,
        query: '?url',
        import: 'default'
    });

    const dataRegistry = Object.keys(rawData).reduce((acc, path) => {
        acc[path] = rawData[path]
        return acc;
    }, {});

    window.ASSG = window.ASSG || {};
    window.ASSG.getDataUrl = (filename) => {
        const lookupKey = `../assets/data/${filename}`;
        const finalUrl = dataRegistry[lookupKey];

        if (!finalUrl) {
            console.warn(`[App Data] File "${filename}" not found in src/assets/data/.`);
            console.debug('Available data files:', Object.keys(dataRegistry));
            return null;
        }
        return finalUrl;
    };

    // Updates the copyright year in the footer.
    if (yearText) { yearText.textContent = new Date().getFullYear(); }

    // Add Accent Bg to Sticky Header on Desktop when scrolled
    if (header) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('is-scrolled', window.scrollY > 20);
        });
    }

    // --- Dropdown Module ---
    const openDropdown = (dropdown, { animate = false } = {}) => {
        const trigger = dropdown.querySelector('[data-dropdown-trigger]');
        const menu = dropdown.querySelector('.nav-dropdown-menu');

        dropdown.classList.add('nav-dropdown-expanded');
        trigger?.setAttribute('aria-expanded', 'true');

        if (!animate || !menu || !menu.animate || isDesktop()) {
            if (menu) menu.style.height = '';
            return;
        }

        menu.getAnimations().forEach((animation) => animation.cancel());
        menu.style.height = '0px';

        const animation = menu.animate(
            { height: ['0px', `${menu.scrollHeight}px`] },
            { duration: 150, easing: 'ease-out' }
        );
        animation.onfinish = () => { menu.style.height = ''; };
    };

    const closeDropdown = (dropdown, { animate = false } = {}) => {
        const trigger = dropdown.querySelector('[data-dropdown-trigger]');
        const menu = dropdown.querySelector('.nav-dropdown-menu');

        if (!dropdown.classList.contains('nav-dropdown-expanded')) return;

        trigger?.setAttribute('aria-expanded', 'false');

        if (!animate || !menu || !menu.animate || isDesktop()) {
            dropdown.classList.remove('nav-dropdown-expanded');
            if (menu) menu.style.height = '';
            return;
        }

        menu.getAnimations().forEach((animation) => animation.cancel());
        menu.style.height = `${menu.offsetHeight}px`;

        const animation = menu.animate(
            { height: [`${menu.offsetHeight}px`, '0px'] },
            { duration: 150, easing: 'ease-out' }
        );
        animation.onfinish = () => {
            dropdown.classList.remove('nav-dropdown-expanded');
            menu.style.height = '';
        };
    };

    const closeAllDropdowns = (options) => {
        dropdowns.forEach((dropdown) => closeDropdown(dropdown, options));
    };

    // --- Mobile Nav Sidebar ---
    const openNav = () => {
        if (!nav || !navToggle) return;
        nav.setAttribute('data-visible', 'true');
        navBackdrop?.setAttribute('data-visible', 'true');
        navToggle.setAttribute('aria-expanded', 'true');
        navToggle.classList.add('nav-open');
        body.style.overflow = 'hidden';
    };

    const closeNav = () => {
        if (!nav || !navToggle) return;
        nav.setAttribute('data-visible', 'false');
        navBackdrop?.setAttribute('data-visible', 'false');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.classList.remove('nav-open');
        body.style.overflow = '';
        closeAllDropdowns();
    };

    if (nav && navToggle && navClose) {
        navToggle.addEventListener('click', () => {
            const isVisible = nav.getAttribute('data-visible') === 'true';
            if (isVisible) { closeNav();
            } else { openNav(); }
        });

        navClose.addEventListener('click', closeNav);
        navBackdrop?.addEventListener('click', closeNav);
        logoLink?.addEventListener('click', closeNav);

        nav.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;
            if (link.classList.contains('nav-dropdown-trigger')) return;
            closeNav();
        });

        document.addEventListener('click', (e) => {
            if (!e.isTrusted) return;
            if (nav.getAttribute('data-visible') !== 'true') { return; }

            const isInsideNav = nav.contains(e.target);
            const isToggle = e.target.closest('.mobile-nav-toggle');

            if (!isInsideNav && !isToggle) { closeNav(); }
        });

        // Reset panel + dropdowns when crossing the breakpoint
        desktopQuery.addEventListener('change', () => {
            closeNav();
            closeAllDropdowns();
        });
    }

    // --- Dropdown Events ---
    dropdowns.forEach((dropdown) => {
        const trigger = dropdown.querySelector('[data-dropdown-trigger]');
        const menu = dropdown.querySelector('.nav-dropdown-menu');
        if (!trigger) return;

        trigger.addEventListener('click', (e) => {
            if (isDesktop()) {
                // Anchors navigate on desktop, buttons only toggle
                if (trigger.tagName === 'BUTTON') {
                    const isOpen = dropdown.classList.contains('nav-dropdown-expanded');
                    if (isOpen) { closeDropdown(dropdown); } else { openDropdown(dropdown); }
                }
                return;
            }

            e.preventDefault();
            const isOpen = dropdown.classList.contains('nav-dropdown-expanded');
            if (isOpen) {
                closeDropdown(dropdown, { animate: true });
            } else {
                openDropdown(dropdown, { animate: true });
            }
        });

        dropdown.addEventListener('mouseenter', () => {
            if (isDesktop()) { openDropdown(dropdown); }
        });

        dropdown.addEventListener('mouseleave', () => {
            if (isDesktop()) { closeDropdown(dropdown); }
        });

        dropdown.addEventListener('focusout', (e) => {
            if (!isDesktop()) return;
            if (dropdown.contains(e.relatedTarget)) return;
            closeDropdown(dropdown);
        });

        trigger.addEventListener('keydown', (e) => {
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

            const items = menu ? [...menu.querySelectorAll('a')] : [];
            if (items.length === 0) return;

            e.preventDefault();
            openDropdown(dropdown);
            const target = e.key === 'ArrowDown' ? items[0] : items[items.length - 1];
            target.focus();
        });

        dropdown.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (!dropdown.classList.contains('nav-dropdown-expanded')) return;

            e.stopPropagation();
            closeDropdown(dropdown);
            trigger.focus();
        });
    });

    // Close desktop dropdowns on outside click
    document.addEventListener('click', (e) => {
        if (!e.isTrusted) return;
        if (!isDesktop()) return;
        dropdowns.forEach((dropdown) => {
            if (dropdown.contains(e.target)) return;
            closeDropdown(dropdown);
        });
    });

    // Escape closes the mobile panel
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (nav?.getAttribute('data-visible') === 'true') { closeNav(); }
    });

    // Mobile Scroll To Top Buttion
    if (scrollTopButton) {
        const handleScroll = () => {
            const scrollPosition = document.body.scrollTop || document.documentElement.scrollTop;

            if (scrollPosition > 100 && window.innerWidth <= 1020) {
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
    let observer = null;

    if (observedElements.length > 0) {

        observer = new IntersectionObserver((entries) => {
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

    return observer;

}
