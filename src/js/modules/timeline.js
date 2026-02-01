'use strict'
import "../../css/modules/timeline.css";

// Generate Timeline from File
export default function init(element) {

    const agendaLists = element.querySelectorAll('.agenda-list[data-content-url]');

    agendaLists.forEach(list => {

        const jsonUrl = window.getDataUrl(list.dataset.contentUrl)
        if (!jsonUrl) {
            console.warn('Agenda list is missing a "data-content-url" attribute.', list);
            return;
        }
        list.innerHTML = '<li class="agenda-message">Loading schedule...</li>';

        const resolvedUrl = new URL(jsonUrl, window.location.href).href;
        fetch(jsonUrl)
            .then(response => {

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const agendaItemsHtml = data.map(item => {

                    const descriptionHtml = item.description
                        ? `<p class="agenda-desc">${item.description}</p>`
                        : '';

                    const hostHtml = item.host
                        ? `<p class="agenda-host">${item.host}</p>`
                        : '';

                    return `
                        <li class="agenda-item">
                            <div class="agenda-time">
                                <time>${item.time}</time>
                            </div>
                            <div class="agenda-content">
                                <h3 class="agenda-title">${item.title}</h3>
                                ${descriptionHtml}
                                ${hostHtml}
                            </div>
                        </li>
                    `;
                }).join('');

                list.innerHTML = agendaItemsHtml;
            })
            .catch(error => {
                console.error('Failed to load agenda data:', error);
                list.innerHTML = '<li class="agenda-message error">Unable to load agenda. Please try refreshing.</li>';
            });
    });
}
