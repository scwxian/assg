'use strict';

// accordion animations handler
export function initAccordionAnimations(parentElement = document) {
    document.querySelectorAll('details').forEach((accordion) => {

        if (accordion.dataset.hasListener) return;
        accordion.dataset.hasListener = 'true';

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
        const nextBtn = tabWrapper.querySelector('.tab-next-btn');

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

        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const currentButton = tabWrapper.querySelector('.tab-button.active');
                if (!currentButton) return;

                const currentIndex = Array.from(tabButtons).indexOf(currentButton);

                let nextIndex = currentIndex + 1;
                if (nextIndex >= tabButtons.length) {
                    nextIndex = 0;
                }

                const nextTab = tabButtons[nextIndex];
                nextTab.click();

                nextTab.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            });
        }
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

// Carousel Handler 
export function initCarousel(parentElement = document) {
    const carousels = parentElement.querySelectorAll('.carousel');

    carousels.forEach(carousel => {
        const track = carousel.querySelector('.carousel-track');
        const slides = Array.from(track.querySelectorAll('.carousel-slide'));
        const nextButton = carousel.querySelector('.carousel-button.next');
        const prevButton = carousel.querySelector('.carousel-button.prev');
        const indicators = Array.from(carousel.querySelectorAll('.carousel-indicator'));

        if (!track || slides.length === 0) return;

        // 1. Setup Intersection Observer to update dots when scrolling/swiping
        const observerOptions = {
            root: track,
            threshold: 0.5 // Trigger when a slide is 50% visible
        };

        const slideObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const activeIndex = slides.indexOf(entry.target);
                    // Update dots
                    indicators.forEach((ind, i) => {
                        ind.classList.toggle('active', i === activeIndex);
                    });
                }
            });
        }, observerOptions);

        slides.forEach(slide => slideObserver.observe(slide));

        // 2. Button Event Listeners
        const scrollAmount = () => track.clientWidth; // Dynamic width calculation

        if (nextButton) {
            nextButton.addEventListener('click', () => {
                // If at the end, scroll back to start, otherwise scroll right
                if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
                    track.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    track.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
                }
            });
        }

        if (prevButton) {
            prevButton.addEventListener('click', () => {
                // If at the start, scroll to end, otherwise scroll left
                if (track.scrollLeft <= 10) {
                    track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' });
                } else {
                    track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
                }
            });
        }

        // 3. Dot Click Listeners
        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                const targetScroll = scrollAmount() * index;
                track.scrollTo({ left: targetScroll, behavior: 'smooth' });
            });
        });

        // 4. Auto-cycle (if data-interval is present)
        if (carousel.dataset.interval) {
            const intervalTime = parseInt(carousel.dataset.interval);
            let autoCycle = setInterval(() => nextButton.click(), intervalTime);

            // Pause on hover or touch
            carousel.addEventListener('mouseenter', () => clearInterval(autoCycle));
            carousel.addEventListener('mouseleave', () => {
                autoCycle = setInterval(() => nextButton.click(), intervalTime);
            });
            carousel.addEventListener('touchstart', () => clearInterval(autoCycle), { passive: true });
            carousel.addEventListener('touchend', () => {
                autoCycle = setInterval(() => nextButton.click(), intervalTime);
            });
        }
    });
}
