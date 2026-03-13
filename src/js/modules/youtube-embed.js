'use strict';
import "../../css/modules/youtube-embed.css";

export default function init(element) {
    const videoId = element.dataset.videoId;
    if (!videoId) return;

    const videoSnippet = element.dataset.videoSnippet;

    if (videoSnippet) {
        const video = document.createElement('video');
        video.src = videoSnippet;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.className = 'video-snippet';

        video.addEventListener('playing', () => {
            video.classList.add('is-playing');
        }, { once: true });

        const overlay = element.querySelector('.video-overlay');
        if (overlay) {
            element.insertBefore(video, overlay);
        } else {
            element.appendChild(video);
        }
    }

    element.addEventListener('click', () => {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('src', `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`);
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        iframe.setAttribute('allowfullscreen', 'true');
        
        element.innerHTML = ''; 
        element.appendChild(iframe);
    }, { once: true });
}

