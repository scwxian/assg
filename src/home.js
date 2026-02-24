'use strict';

import { initAccordionAnimations, initTooltips, initCarousel } from '/js/utils.js';

export default function init() { 
    const contentContainer = document.querySelector('#swup[data-page="home"]');
    if (!contentContainer) return;

    initAccordionAnimations(contentContainer);
    initCarousel(contentContainer);

    const { clickOutsideHandler, tooltip } = initTooltips(contentContainer);
    
    return function cleanupHomePage() {
        if (clickOutsideHandler) {
            document.removeEventListener('click', clickOutsideHandler);
        }
        
        if (tooltip && tooltip.parentNode === document.body) {
            document.body.removeChild(tooltip);
        }
    };
}
