'use strict';

// accordion animations handler
export function initAccordionAnimations(parentElement = document) {
    document.querySelectorAll('details').forEach((accordion) => {
        const summary = accordion.querySelector('summary');
        const contentWrapper = accordion.querySelector('.details-content');

        if (!summary || !contentWrapper) {
            return;
        }

        summary.addEventListener('click', (event) => {
            event.preventDefault();

            if (accordion.open) {
                accordion.classList.remove('is-open');

                const animation = contentWrapper.animate(
                    { height: [`${contentWrapper.offsetHeight}px`, '0px'] },
                    { duration: 150, easing: 'ease-out' }
                );
                animation.onfinish = () => {
                    accordion.removeAttribute('open');
                };
            } else {
                accordion.setAttribute('open', '');
                accordion.classList.add('is-open');

                contentWrapper.animate(
                    { height: ['0px', `${contentWrapper.scrollHeight}px`] },
                    { duration: 150, easing: 'ease-out' }
                );
            }
        });
    });
}

// tab layout handler
export function initTabLayout(parentElement = document) {

    const allTabWrappers = parentElement.querySelectorAll('.tab-wrapper');

    allTabWrappers.forEach(tabWrapper => {
        const tabNav = tabWrapper.querySelector('.tab-nav');
        const tabContent = tabWrapper.querySelector('.tab-content');
        const tabButtons = tabWrapper.querySelectorAll('.tab-button');
        const tabPanes = tabWrapper.querySelectorAll('.tab-pane');

        if (!tabNav || !tabContent || !tabButtons.length || !tabPanes.length) {
            console.warn('Skipping a tab-wrapper due to missing elements.');
            return; 
        }

        tabNav.addEventListener('click', (event) => {
            const clickedButton = event.target.closest('.tab-button');

            if (!clickedButton) { return; }
            event.preventDefault();

            const targetTabId = clickedButton.dataset.tab;
            if (!targetTabId) {
                console.error('Tab button is missing a "data-tab" attribute.', clickedButton);
                return;
            }

            const targetPane = tabContent.querySelector(`#${targetTabId}`);
            
            if (!targetPane) {
                console.error(`No tab pane found with ID: #${targetTabId}`);
                return;
            }

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            clickedButton.classList.add('active');
            targetPane.classList.add('active');
        });
    });
}

// tooltips handler
export function initTooltips(parentElement = document) {

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    document.body.appendChild(tooltip);

    function positionTooltip(targetElement) {
        const targetRect = targetElement.getBoundingClientRect();
        const top = targetRect.top + window.scrollY;
        const left = targetRect.left + (targetRect.width / 2) + window.scrollX;

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top - 10}px`;

        const gutter = 10;
        const verticalTransform = 'translateY(-100%)';
        tooltip.style.transform = `translateX(-50%) ${verticalTransform}`;
        const rect = tooltip.getBoundingClientRect();

        const leftOverflow = gutter - rect.left;
        const rightOverflow = rect.right - (window.outerWidth - gutter);

        if (leftOverflow > 0) {
            tooltip.style.transform = `translateX(calc(-50% + ${leftOverflow}px)) ${verticalTransform}`;
        } else if (rightOverflow > 0) {
            tooltip.style.transform = `translateX(calc(-50% - ${rightOverflow}px)) ${verticalTransform}`;
        }
    }

    const triggers = parentElement.querySelectorAll('[data-tooltip-content]');

    triggers.forEach(trigger => {
        const tooltipContent = trigger.dataset.tooltipContent;
        if (!tooltipContent) return; 

        trigger.addEventListener('mouseenter', () => {
            tooltip.textContent = tooltipContent;
            positionTooltip(trigger);
            tooltip.classList.add('visible');
        });

        trigger.addEventListener('mouseleave', () => {
            if (!trigger.classList.contains('tooltip-locked')) {
                tooltip.classList.remove('visible');
            }
        });

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isLocked = trigger.classList.toggle('tooltip-locked');

            if (isLocked) {
                tooltip.textContent = tooltipContent;
                positionTooltip(trigger);
                tooltip.classList.add('visible');
            } else {
                tooltip.classList.remove('visible');
            }

            parentElement.querySelectorAll('.tooltip-locked').forEach(icon => {
                if (icon !== trigger) {
                    icon.classList.remove('tooltip-locked');
                }
            });
        });
    });

    const clickOutsideHandler = (e) => {
        if (!e.target.closest('[data-tooltip-content]')) {
            tooltip.classList.remove('visible');
            parentElement.querySelectorAll('.tooltip-locked').forEach(icon => {
                icon.classList.remove('tooltip-locked');
            });
        }
    };

    document.addEventListener('click', clickOutsideHandler);

    return { clickOutsideHandler, tooltip };
}

