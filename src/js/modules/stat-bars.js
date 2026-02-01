'use strict'
import "../../css/modules/stat-bars.css";
import { initTooltips } from '../utils.js';

const statDescriptions = {
    stat1: "stat 1 description",
    stat2: "stat 2 description",
    stat3: "stat 3 description",
    stat4: "stat 4 description",
    stat5: "stat 5 description"
};

// Generate Stat Bar Logic 
export default function init(element) {
    const statItems = element.querySelectorAll('.stat-item');

    statItems.forEach(item => {
        const statId = item.dataset.statId;
        const moreInfo = item.querySelector('.more-info');

        // --- Bar Generation Logic ---
        const value = parseInt(item.dataset.statValue) || 0;
        const max = parseInt(item.dataset.statMax) || 10;
        const barContainer = item.querySelector('.segmented-bar-container');
        const valueDisplay = item.querySelector('.stat-value');

        if (valueDisplay) {
            valueDisplay.textContent = `${value}/${max}`;
        }
        if (barContainer) {
            barContainer.innerHTML = '';
            for (let i = 0; i < max; i++) {
                const segment = document.createElement('span');
                segment.className = 'segment';
                if (i < value) {
                    segment.classList.add('filled');
                }
                barContainer.appendChild(segment);
            }
        }

        if (moreInfo) {
            const description = statDescriptions[statId] || 'Description not found';
            moreInfo.setAttribute('data-tooltip-content', description)
        }
    });

    const contentContainer = document.querySelector('main');
    if (!contentContainer) return;
    const { clickOutsideHandler, tooltip } = initTooltips(contentContainer);

}
