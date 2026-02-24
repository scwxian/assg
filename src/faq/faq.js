'use strict';

import { initAccordionAnimations } from '../js/utils.js';

// --- Utilities ---
// Between Dialogue Down/Silent Time
const wait = (ms, signal) => new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    if (signal) {
        signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('Aborted')); 
        }, { once: true });
    }
});

// Dialogue Generation
async function typeSentence(state, signal) {
    const { lines, index, element } = state;
    const line = lines[index];
    element.classList.add('is-typing');

    const typeDuration = 1500;
    const delay = typeDuration / line.length;

    for (let i = 0; i < line.length; i++) {
        await wait(delay, signal); // Pass signal to wait
        element.textContent = line.substring(0, i + 1);
    }

    element.classList.remove('is-typing');
    state.index = (index + 1) % lines.length;
}

// Dialogue Deletion
async function backspaceSentence(state, signal) {
    const { element } = state;
    element.classList.add('is-typing');

    const deleteDuration = 500;
    const delay = deleteDuration / element.textContent.length;

    for (let i = element.textContent.length; i > 0; i--) {
        await wait(delay, signal);
        element.textContent = element.textContent.substring(0, i - 1);
    }
    element.classList.remove('is-typing');
}

// Dialogue Loop Handler
async function startDialogueLoop(state, signal) {
    try {
        state.box.classList.add('is-visible');
        await typeSentence(state, signal);
        await wait(2500, signal);
        await backspaceSentence(state, signal);
        state.box.classList.remove('is-visible');
        await wait(200, signal);
        await wait(2000, signal);

        if (!signal.aborted) {
            startDialogueLoop(state, signal);
        }
    } catch (error) {
        if (error.message !== 'Aborted' && error.name !== 'AbortError') {
            console.error('Dialogue loop error:', error);
        }
    }
}

export default function init() {
    // --- Define Elements ---
    const buttonsContainer = document.getElementById('npc-carousel-container');
    const contentContainer = document.getElementById('faq-content');
    const scrollLeftButton = document.getElementById('scroll-left');
    const scrollRightButton = document.getElementById('scroll-right');

    // --- Page-Specific State ---
    const dialogueState = {};
    let currentAbortController = new AbortController();

    // Check if essential containers are present
    if (!buttonsContainer || !contentContainer || !scrollLeftButton || !scrollRightButton) {
        console.warn('FAQ elements not found. Aborting init.');
        return function cleanup() {};
    }

    const npcCards = buttonsContainer.querySelectorAll('.npc-card');
    if (npcCards.length === 0) {
        initAccordionAnimations(contentContainer);
        return function cleanup() {};
    }

    let firstStateId = null;
    let currentIndex = 0;

    npcCards.forEach((card, index) => {
        const targetId = card.dataset.target;
        const dialogueBox = card.querySelector('.dialogue-box');
        const dialogueText = card.querySelector('.dialogue-text');

        // Find the initially active card
        if (card.classList.contains('active')) {
            firstStateId = targetId;
            currentIndex = index;
        }

        let dialogueLines = [];
        try {
            dialogueLines = JSON.parse(card.dataset.dialogue || '[]');
        } catch (e) {
            console.error('Failed to parse dialogue JSON from card:', card, e);
        }

        if (targetId && dialogueBox && dialogueText) {
            dialogueState[targetId] = {
                lines: dialogueLines,
                index: 0,
                element: dialogueText,
                box: dialogueBox
            };
        }
    });


    // --- Carousel Logic ---
    function setActiveNpc(index) {
        currentAbortController.abort();
        currentAbortController = new AbortController();

        Object.values(dialogueState).forEach(state => {
            state.box.classList.remove('is-visible');
        });

        currentIndex = index;
        const targetCard = npcCards[index];
        if (!targetCard) return;

        const targetId = targetCard.dataset.target;

        npcCards.forEach(card => card.classList.toggle('active', card === targetCard));
        contentContainer.querySelectorAll('.faq-category-content').forEach(content => {
            content.classList.toggle('active', content.id === targetId);
        });

        targetCard.scrollIntoView({
            behavior: 'smooth',
            inline: 'center',
            block: 'nearest'
        });

        const newState = dialogueState[targetId];
        if (newState && newState.lines.length > 0) {
            startDialogueLoop(newState, currentAbortController.signal);
        }
    }

    // --- Event Listeners ---
    buttonsContainer.addEventListener('click', (e) => {
        const targetCard = e.target.closest('.npc-card');
        if (!targetCard) return;
        const index = Array.from(npcCards).indexOf(targetCard);
        if (index !== -1) {
            setActiveNpc(index);
        }
    });

    scrollLeftButton.addEventListener('click', () => {
        const newIndex = (currentIndex - 1 + npcCards.length) % npcCards.length;
        setActiveNpc(newIndex);
    });

    scrollRightButton.addEventListener('click', () => {
        const newIndex = (currentIndex + 1) % npcCards.length;
        setActiveNpc(newIndex);
    });

    // --- Initialize Accordions ---
    initAccordionAnimations(contentContainer);

    // --- Start initial dialogue ---
    if (firstStateId) {
        const firstState = dialogueState[firstStateId];
        if (firstState && firstState.lines.length > 0) {
            startDialogueLoop(firstState, currentAbortController.signal);
        }
    }

    return function cleanupFaqPage() {
        currentAbortController.abort();
    };
}
