import Swup from 'swup';
import SwupPreloadPlugin from '@swup/preload-plugin';
import SwupHeadPlugin from '@swup/head-plugin';
import { initPersistent, initPage } from './main.js';

// --- Global State ---
let currentPageCleanup = null;
let currentObserver = null;
// Page modules live anywhere except js/
const pageModules = import.meta.glob(['../**/*.js', '!../js/**']);

// Index by id so depth and directory don't matter
const pageModuleIndex = Object.keys(pageModules).reduce((index, key) => {
    const id = key.split('/').pop().replace(/\.js$/, '');
    (index[id] ||= []).push(key);
    return index;
}, {});

initPersistent();

// --- Nav Active State Updater ---
function updateNavActiveState() {
    const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
    const navLinks = document.querySelectorAll('header nav a');

    navLinks.forEach(link => {
        const url = new URL(link.href);

        link.removeAttribute('aria-current');

        if (url.hash || link.classList.contains('nav-cta-button')) return;

        const linkPath = url.pathname.replace(/\/$/, '') || '/';
        const isDropdownTrigger = link.hasAttribute('data-dropdown-trigger');
        const isSectionMatch = isDropdownTrigger && linkPath !== '/' && currentPath.startsWith(`${linkPath}/`);

        if (linkPath === currentPath || isSectionMatch) {
            link.setAttribute('aria-current', 'page');
        }
    });

    // Non-link triggers rely on data-dropdown-base for highlighting
    document.querySelectorAll('header .nav-dropdown').forEach(dropdown => {
        const basePath = (dropdown.dataset.dropdownBase || '').replace(/\/$/, '');
        const isActive = Boolean(basePath) && (currentPath === basePath || currentPath.startsWith(`${basePath}/`));
        dropdown.classList.toggle('is-active', isActive);
    });
}

// Prefer page's own dir, fall back to shared module
function resolvePageModule(pageIdentifier) {
    const pageDir = window.location.pathname.replace(/^\/|\/$/g, '');
    const candidates = pageModuleIndex[pageIdentifier] || [];

    if (candidates.length > 1) {
        console.debug(`[Page JS] Multiple modules for "${pageIdentifier}":`, candidates);
    }

    return candidates.find((key) => key === `../${pageDir}/${pageIdentifier}.js`)
        || candidates[0]
        || null;
}

// --- Mount/Unmount Logic ---
async function mountPage() {

    updateNavActiveState();
    // Run global page logic (animations, etc.)
    currentObserver = initPage();

    // Run page-specific logic
    const pageIdentifier = (document.getElementById('swup')?.dataset.page || '').trim();
    currentPageCleanup = null;
    if (!pageIdentifier) return;

    const moduleKey = resolvePageModule(pageIdentifier);
    if (!moduleKey) return;

    try {
        const module = await pageModules[moduleKey]();

        if (typeof module.default === 'function') {
            currentPageCleanup = module.default();
        } else {
            console.warn(`[Router] Page script found for "${pageIdentifier}" but no default export function provided.`);
        }
    } catch (error) {
        console.error(`[Router] Error loading script for page: ${pageIdentifier}`, error);
    }
}

// This function runs *before* the new page content is added
function unmountPage() {
    if (typeof currentPageCleanup === 'function') {
        currentPageCleanup();
    }
    currentPageCleanup = null;

    if (currentObserver) {
        currentObserver.disconnect();
        currentObserver = null;
    }
}

// --- Initialize Swup ---
const swup = new Swup({
    containers: ['#swup'],
    animationSelector: '#swup',
    plugins: [
        new SwupHeadPlugin({ 
            awaitAssets: true,
            persistTags: 'link[rel="stylesheet"], style'
        }),
        new SwupPreloadPlugin()
    ]
});

// --- Swup Hooks ---
swup.hooks.on('page:view', mountPage);
swup.hooks.on('content:replace', unmountPage);
mountPage();
