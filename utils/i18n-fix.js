// utils/i18n-fix.js
document.addEventListener('DOMContentLoaded', function() {
  const replaceI18nPlaceholders = (node) => {
    if (!node) return;

    const processNode = (currentNode) => {
        // For text nodes, replace content
        if (currentNode.nodeType === Node.TEXT_NODE) {
            if (currentNode.textContent && currentNode.textContent.includes('__MSG_')) {
                currentNode.textContent = currentNode.textContent.replace(/__MSG_([\w@]+)__/g, (match, key) => {
                    const message = chrome.i18n.getMessage(key);
                    return message || match;
                });
            }
        }
        // For element nodes, replace attributes and recurse
        else if (currentNode.nodeType === Node.ELEMENT_NODE) {
            if (currentNode.attributes) {
                for (const attr of currentNode.attributes) {
                    if (attr.value && attr.value.includes('__MSG_')) {
                        attr.value = attr.value.replace(/__MSG_([\w@]+)__/g, (match, key) => {
                            const message = chrome.i18n.getMessage(key);
                            return message || match;
                        });
                    }
                }
            }
            if (currentNode.childNodes) {
                currentNode.childNodes.forEach(processNode);
            }
        }
    };
    processNode(node);
  };

  // Initial replacement on the whole document
  replaceI18nPlaceholders(document.documentElement);

  // Use a MutationObserver to handle dynamically added content
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        replaceI18nPlaceholders(node);
      }
    }
  });

  // Start observing the body for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});
