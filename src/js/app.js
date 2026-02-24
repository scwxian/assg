import Swup from 'swup';
import SwupPreloadPlugin from '@swup/preload-plugin';
import SwupHeadPlugin from '@swup/head-plugin';
import { initPersistent, initPage } from './main.js';

// --- Global State ---
let currentPageCleanup = null;
let currentObserver = null;
const pageModules = import.meta.glob([
    '../*.js', 
    '../*/*.js',
    '!./main.js'
]);
initPersistent();

// --- Nav Active State Updater ---
function updateNavActiveState() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('header nav a');

    navLinks.forEach(link => {
        const url = new URL(link.href);

        if (url.hash) {
            link.removeAttribute('aria-current');
            return;
        }

        const linkPath = url.pathname.replace(/\/$/, '');
        const activePath = currentPath.replace(/\/$/, '');

        if (linkPath === activePath) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}

// --- Mount/Unmount Logic ---
async function mountPage() {

    updateNavActiveState();
    // Run global page logic (animations, etc.)
    currentObserver = initPage();

    // Run page-specific logic
    const pageIdentifier = document.getElementById('swup')?.dataset.page;
    if (!pageIdentifier) return;
    currentPageCleanup = null;

    const matchPath = Object.keys(pageModules).find((path) =>
        path.endsWith(`/${pageIdentifier}.js`)
    );

    if (matchPath) {
        try {
            const module = await pageModules[matchPath]();

            if (typeof module.default === 'function') {
                currentPageCleanup = module.default();
            } else {
                console.warn(`[Router] Page script found for "${pageIdentifier}" but no default export function provided.`);
            }
        } catch (error) {
            console.error(`[Router] Error loading script for page: ${pageIdentifier}`, error);
        }
    } else {
        console.warn(`[Page JS] No specific script found for page: ${pageIdentifier}`)
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
        new SwupHeadPlugin({ awaitAssets: true }),
        new SwupPreloadPlugin()
    ]
});

// --- Swup Hooks ---
swup.hooks.on('page:view', mountPage);
swup.hooks.on('content:replace', unmountPage);
mountPage();
