// Popup UI Logic
// Agent D: Interaction design patterns
// Agent E: Clear error messages that cite actual failures

const captureBtn = document.getElementById('capture-btn');
const viewContextsBtn = document.getElementById('view-contexts-btn');
const statusMessage = document.getElementById('status-message');
const recentContextsDiv = document.getElementById('recent-contexts');
const contextsList = document.getElementById('contexts-list');

/**
 * Show status message to user (Agent D: clear feedback)
 * @param {string} message - Message text
 * @param {string} type - 'success', 'error', or 'info'
 */
function showStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = `status status-${type}`;
  statusMessage.classList.remove('hidden');
  
  // Auto-hide after 5 seconds for success messages
  if (type === 'success') {
    setTimeout(() => {
      statusMessage.classList.add('hidden');
    }, 5000);
  }
}

/**
 * Capture context from current tab (Agent D: one-button operation)
 */
async function captureContext() {
  captureBtn.disabled = true;
  captureBtn.textContent = '⏳ Capturing...';
  
  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error('No active tab found');
    }
    
    // Check if we're on a supported site
    const url = tab.url || '';
    if (!url.includes('chat.openai.com') && !url.includes('claude.ai')) {
      throw new Error(
        'This page is not supported. ' +
        'Context Bridge works on chat.openai.com and claude.ai only.'
      );
    }
    
    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'captureContext'
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to capture context');
    }
    
    // Save to background storage
    const saveResponse = await chrome.runtime.sendMessage({
      action: 'saveContext',
      data: {
        messages: response.messages,
        site: response.site,
        url: tab.url,
        title: tab.title
      }
    });
    
    if (!saveResponse.success) {
      throw new Error(saveResponse.error || 'Failed to save context');
    }
    
    showStatus(
      `✓ Captured ${response.messages.length} messages from ${response.site.toUpperCase()}`,
      'success'
    );
    
    // Update badge
    chrome.runtime.sendMessage({
      action: 'updateBadge',
      status: 'synced'
    });
    
  } catch (error) {
    console.error('[Context Bridge] Capture failed:', error);
    showStatus(
      `Error: ${error.message}`,
      'error'
    );
    
    chrome.runtime.sendMessage({
      action: 'updateBadge',
      status: 'error'
    });
  } finally {
    captureBtn.disabled = false;
    captureBtn.textContent = '📋 Capture Context from This Page';
  }
}

/**
 * View recent contexts (Agent D: user-facing storage management)
 */
async function viewRecentContexts() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getRecentContexts',
      limit: 5
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to retrieve contexts');
    }
    
    if (response.conversations.length === 0) {
      contextsList.innerHTML = '<p style="color: #6b7280; font-size: 13px;">No saved contexts yet. Capture one first!</p>';
    } else {
      contextsList.innerHTML = response.conversations.map(conv => {
        const date = new Date(conv.timestamp).toLocaleString();
        const messageCount = conv.messages?.length || 0;
        const site = conv.site || 'unknown';
        
        return `
          <div style="padding: 8px; margin-bottom: 4px; background: #f9fafb; border-radius: 4px; font-size: 12px;">
            <div style="font-weight: 500; color: #111827;">${site.toUpperCase()}</div>
            <div style="color: #6b7280;">${messageCount} messages · ${date}</div>
          </div>
        `;
      }).join('');
    }
    
    recentContextsDiv.classList.remove('hidden');
    
  } catch (error) {
    console.error('[Context Bridge] View contexts failed:', error);
    showStatus(`Error: ${error.message}`, 'error');
  }
}

// Event listeners
captureBtn.addEventListener('click', captureContext);
viewContextsBtn.addEventListener('click', viewRecentContexts);

// Initialize: check current page
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = tabs[0]?.url || '';
  
  if (!url.includes('chat.openai.com') && !url.includes('claude.ai')) {
    showStatus(
      'Navigate to ChatGPT or Claude to use Context Bridge',
      'info'
    );
    captureBtn.disabled = true;
  }
});
