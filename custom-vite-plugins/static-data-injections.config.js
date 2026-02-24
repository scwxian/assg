import fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const injections = [

  // Timeline
  {
    targetPage: '/about/index.html',
    placeholder: '%%AGENDA_DAY_1%%',
    dataPath: 'src/assets/data/day-1.json', 
    renderer: (data) => {
      if (!data || !Array.isArray(data)) return '<li class="agenda-message error">Error loading schedule.</li>';

      const agendaItemsHtml = data.map(item => `
        <li class="agenda-item">
            <div class="agenda-time">
                <time>${item.time}</time>
            </div>
            <div class="agenda-content">
                <h4 class="agenda-title">${item.title}</h4>
                ${item.description ? `<p class="agenda-desc">${item.description}</p>` : ''}
                ${item.host ? `<p class="agenda-host">${item.host}</p>` : ''}
            </div>
        </li>
      `).join('');

      return `
        <ul class="agenda-list desktop">
            ${agendaItemsHtml}
        </ul>
        <details class="agenda-list mobile">
            <summary>Learn More</summary>
            <div class="details-content">
                <ul class="agenda-list">
                    ${agendaItemsHtml}
                </ul>
            </div>
        </details>
      `;
    }
  },

  // FAQ Schema
  {
    targetPage: '/faq/index.html',
    placeholder: '%%FAQ_SCHEMA%%',
    dataPath: 'src/assets/data/faq.json5',
    renderer: (faqData) => {
      if (!faqData) return '';
      const allQuestions = faqData.flatMap(category =>
        category.questions.map(qa => ({
          "@type": "Question",
          "name": qa.q,
          "acceptedAnswer": { "@type": "Answer", "text": qa.a }
        }))
      );
      const schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "name": "FAQ | %%SITE_NAME%%",
        "url": "%%SITE_URL%%/faq",
        "description": "FAQ Description",
        "mainEntity": allQuestions
      };
      return `<script id="faq-schema-script" type="application/ld+json">${JSON.stringify(schema)}</script>`;
    }
  },

  // FAQ NPC Cards
{
    targetPage: '/faq/index.html',
    placeholder: '%%FAQ_NPC_CARDS%%',
    dataPath: 'src/assets/data/faq.json5',
    renderer: (faqData, ctx) => {
      if (!faqData) return '';
      return faqData.map((category, index) => {

        const npcNameLower = category.npcName.toLowerCase().replace(/\s+/g, '-');
        const imgPath = `assets/images/faq-${npcNameLower}.png`;
        const fallbackPath = `assets/images/faq-npc-placeholder.png`;
        const finalSrcUrl = ctx.resolveImage(imgPath, fallbackPath);
        const escapedDialogueData = JSON.stringify(category.dialogue || []).replace(/'/g, '&#39;');

        return `
        <div class="npc-card ${index === 0 ? 'active' : ''}" data-target="${category.id}" data-dialogue='${escapedDialogueData}'>
            <div class="dialogue-box">
                <p class="dialogue-text"></p>
                <div class="dialogue-tail"></div>
            </div>
            <img class="npc-image" src="${finalSrcUrl}" alt="${category.npcName}" loading="lazy" style="opacity:0.9;">
            <div class="npc-name-container">
                <span class="npc-name-main">${category.npcName}</span>
                <span class="npc-name-category">${category.category}</span>
            </div>
        </div>`;
      }).join('');
    }
  },

  // FAQ Content
  {
    targetPage: '/faq/index.html',
    placeholder: '%%FAQ_CONTENT%%',
    dataPath: 'src/assets/data/faq.json5',
    renderer: (faqData) => {
      if (!faqData) return '';
      return faqData.map((category, index) => `
        <div class="faq-category-content ${index === 0 ? 'active' : ''}" id="${category.id}">
            ${category.questions.map(qa => `
                <details>
                    <summary>${qa.q}</summary>
                    <div class="details-content">
                        <p>${qa.a}</p>
                    </div>
                </details>
            `).join('')}
        </div>
      `).join('');
    }
  }
];
