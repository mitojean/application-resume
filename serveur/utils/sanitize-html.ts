import sanitizeHtml from 'sanitize-html';

/**
 * Nettoie un texte HTML
 */
export const sanitizeHtmlInput = (html: string): string => {
  return sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
    transformTags: {
      '*': (tagName, attribs) => {
        return {
          tagName: 'span', // Replace all tags with <span>
          attribs: {} // Remove all attributes
        };
      }
    },
    // Handle special characters and spaces
    parser: {
      decodeEntities: true
    },
    textFilter: (text) => {
      // Convert non-breaking spaces to regular spaces
      return text.replace(/\u00A0/g, ' ');
    }
  });
};
