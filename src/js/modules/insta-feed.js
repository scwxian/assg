'use strict';
import "../../css/modules/insta-feed.css";

const BEHOLD_JSON_URL = import.meta.env.VITE_INSTAGRAM_FEED_URL;

// Helper function to truncate captions
const truncate = (str = '', len = 125) => {
    const cleanStr = str.replace(/\s+/g, ' ').trim();
    if (cleanStr.length <= len) return cleanStr;
    const lastSpace = cleanStr.lastIndexOf(' ', len - 3);
    if (lastSpace === -1) {
        return cleanStr.substring(0, len - 3) + '...';
    }
    return cleanStr.substring(0, lastSpace) + '...';
};

// Fetches and populates IG Feed from Behold
export default async function init(feedContainer) {

    if (!feedContainer) { return; }
    if (!feedContainer.querySelector('.insta-feed-grid .skeleton-post')) { return; }

    try {
        const response = await fetch(BEHOLD_JSON_URL);
        if (!response.ok) {
            throw new Error(`Network error: ${response.status}`);
        }
        const data = await response.json();

        if (!data.posts || data.posts.length === 0) {
            throw new Error('No posts returned from feed.');
        }

        // --- Success: Build the Feed ---
        feedContainer.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'insta-feed-grid';

        data.posts.forEach(post => {
            const permalink = post.permalink;
            const imageUrl = post.sizes?.medium?.mediaUrl || post.mediaUrl;
            const caption = post.caption;
            const mediaType = post.mediaType;
            const altText = truncate(caption, 125) || 'Instagram post by My Site';
            const postLink = document.createElement('a');

            postLink.className = 'insta-post';
            postLink.href = permalink;
            postLink.target = '_blank';
            postLink.rel = 'noopener noreferrer';
            postLink.setAttribute('aria-label', `View Instagram post: ${altText}`);

            postLink.innerHTML = `
                <img src="${imageUrl}" alt="${altText}" loading="lazy">

                <div class="overlay">
                    <span class="overlay-text">
                        <svg class="overlay-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                    </span>
                </div>

                ${mediaType === 'VIDEO' ? `
                    <div class="video-icon-overlay">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5.14v13.72L19.25 12 8 5.14z"/>
                        </svg>
                    </div>
                ` : ''}
            `;
            grid.appendChild(postLink);
        });

        feedContainer.appendChild(grid);

    } catch (error) {
        console.error('Error loading Instagram feed:', error);
        if (feedContainer) {
            feedContainer.innerHTML = `
                <p class="section-body center-text" style="opacity: 0.7;">
                    Could not load the feed. <br>
                    Check out our latest posts on
                    <a href="https://instagram.com/myhandle" target="_blank" rel="noopener noreferrer">Instagram</a>.
                </p>
            `;
        }
    }
}
