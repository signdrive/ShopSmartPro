// ebay/ebay-content.js - Handle eBay API responses
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ebayApiResponse') {
    // Handle eBay API responses here if needed
    console.log('eBay API response received', request.data);
  }
  return false;
});