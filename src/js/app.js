import Swup from 'swup';
import SwupPreloadPlugin from '@swup/preload-plugin';
import SwupHeadPlugin from '@swup/head-plugin';
import { initPersistent, initPage } from './main.js';

// --- Global State ---
let currentPageCleanup = null;
const pageModules = import.meta.glob([
    '../*.js', 
    '../*/*.js',
    '!./main.js'
]);
initPersistent();

// --- Mount/Unmount Logic ---
async function mountPage() {
    // Run global page logic (animations, etc.)
    initPage();

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
