// Content Script - Runs on ChatGPT and Claude pages
// Agent A: Event-driven architecture with MutationObserver
// Agent B: Quiescence detection for SPA stability
// Agent E: Exhaustive naming, single responsibility, error messages cite failures

import {
  CHATGPT_MESSAGE_SELECTOR,
  CHATGPT_MESSAGE_AUTHOR_ROLE_ATTRIBUTE,
  CHATGPT_MARKDOWN_CONTENT_SELECTOR,
  CHATGPT_USER_MESSAGE_TESTID,
  CLAUDE_API_BASE_URL,
  CLAUDE_USER_MESSAGE_TESTID,
  CLAUDE_CONTENT_SELECTOR,
  DOM_QUIESCENCE_QUIET_MS,
  DOM_QUIESCENCE_MAX_MS
} from './constants.js';

// Detect which site we're on
const currentSite = window.location.hostname.includes('openai.com') ? 'chatgpt' : 
                    window.location.hostname.includes('claude.ai') ? 'claude' : null;

if (!currentSite) {
  console.error('[Context Bridge] Unknown site, extension will not activate');
}

/**
 * Wait for DOM stability before extraction (Agent B research)
 * Median 410ms vs 1500ms for fixed delays
 * @param {Object} options - Configuration
 * @returns {Promise<void>}
 */
function waitForDOMQuiescence(options = {}) {
  const quietMs = options.quietMs || DOM_QUIESCENCE_QUIET_MS;
  const maxMs = options.maxMs || DOM_QUIESCENCE_MAX_MS;
  
  return new Promise((resolve) => {
    let timer = null;
    const deadline = Date.now() + maxMs;
    
    const done = () => {
      observer.disconnect();
      if (timer !== null) clearTimeout(timer);
      resolve();
    };
    
    const observer = new MutationObserver(() => {
      if (Date.now() > deadline) {
        done();
        return;
      }
      
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(done, quietMs);
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: false,
      attributes: false
    });
    
    // If no mutations at all, resolve immediately
    timer = setTimeout(done, quietMs);
  });
}

/**
 * Extract conversation from ChatGPT DOM (Agent B research)
 * @returns {Promise<Array<Object>>} Array of message objects
 */
async function extractChatGPTConversationFromDOM() {
  const messages = [];
  
  try {
    // Wait for DOM stability
    await waitForDOMQuiescence();
    
    // Find all message elements
    const messageElements = document.querySelectorAll('article');
    
    if (messageElements.length === 0) {
      throw new Error(
        `Failed to extract ChatGPT messages: ` +
        `querySelector('article') returned empty. ` +
        `ChatGPT may have updated their DOM structure.`
      );
    }
    
    messageElements.forEach((article, index) => {
      const roleElement = article.querySelector(`[${CHATGPT_MESSAGE_AUTHOR_ROLE_ATTRIBUTE}]`);
      
      if (!roleElement) return;
      
      const role = roleElement.getAttribute(CHATGPT_MESSAGE_AUTHOR_ROLE_ATTRIBUTE);
      
      let content = '';
      if (role === 'assistant') {
        const markdownElement = article.querySelector(CHATGPT_MARKDOWN_CONTENT_SELECTOR);
        content = markdownElement?.textContent.trim() || '';
      } else if (role === 'user') {
        const userElement = article.querySelector(`[data-testid="${CHATGPT_USER_MESSAGE_TESTID}"]`);
        content = userElement?.textContent.trim() || '';
      }
      
      if (content) {
        messages.push({
          role,
          content,
          timestamp: new Date().toISOString(),
          index,
          source: 'chatgpt'
        });
      }
    });
    
    console.log(`[Context Bridge] Extracted ${messages.length} messages from ChatGPT`);
    return messages;
    
  } catch (error) {
    console.error('[Context Bridge] ChatGPT extraction failed:', error.message);
    throw error;
  }
}

/**
 * Extract conversation from Claude API (Agent B research - API-first approach)
 * @returns {Promise<Array<Object>>} Array of message objects
 */
async function extractClaudeConversationFromAPI() {
  try {
    // Get organization ID
    const orgResponse = await fetch('/api/organizations', {
      credentials: 'include'
    });
    
    if (!orgResponse.ok) {
      throw new Error(`Failed to fetch Claude organizations: HTTP ${orgResponse.status}`);
    }
    
    const orgs = await orgResponse.json();
    if (!orgs || orgs.length === 0) {
      throw new Error('No Claude organizations found');
    }
    
    const orgId = orgs[0].uuid;
    
    // Get conversation ID from URL
    const conversationIdMatch = window.location.pathname.match(/\/chat\/([a-f0-9-]+)/);
    if (!conversationIdMatch) {
      throw new Error('No conversation ID found in Claude URL');
    }
    
    const conversationId = conversationIdMatch[1];
    
    // Fetch full conversation
    const convResponse = await fetch(
      `/api/organizations/${orgId}/chat_conversations/${conversationId}` +
      '?tree=True&rendering_mode=messages&render_all_tools=true',
      { credentials: 'include' }
    );
    
    if (!convResponse.ok) {
      throw new Error(`Failed to fetch Claude conversation: HTTP ${convResponse.status}`);
    }
    
    const data = await convResponse.json();
    
    // Parse API response (Agent B research)
    const messages = [];
    const messageMap = new Map();
    
    data.chat_messages.forEach(msg => {
      messageMap.set(msg.uuid, msg);
    });
    
    // Walk from current_leaf_message_uuid to root
    let currentId = data.current_leaf_message_uuid;
    while (currentId && messageMap.has(currentId)) {
      const msg = messageMap.get(currentId);
      
      const content = msg.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');
      
      const thinking = msg.content
        .filter(block => block.type === 'thinking')
        .map(block => block.thinking)
        .join('\n');
      
      messages.unshift({
        role: msg.sender, // "human" or "assistant"
        content,
        thinking,
        timestamp: msg.created_at,
        uuid: msg.uuid,
        source: 'claude'
      });
      
      currentId = msg.parent_message_uuid;
    }
    
    console.log(`[Context Bridge] Extracted ${messages.length} messages from Claude API`);
    return messages;
    
  } catch (error) {
    console.error('[Context Bridge] Claude API extraction failed, falling back to DOM:', error.message);
    return extractClaudeDOMFallback();
  }
}

/**
 * Fallback DOM extraction for Claude (Agent B research)
 * @returns {Promise<Array<Object>>} Array of message objects
 */
async function extractClaudeDOMFallback() {
  await waitForDOMQuiescence();
  
  const messages = [];
  
  const userMessages = document.querySelectorAll(`[data-testid="${CLAUDE_USER_MESSAGE_TESTID}"]`);
  const assistantMessages = document.querySelectorAll('[data-is-streaming], .whitespace-pre-wrap.break-words');
  
  if (userMessages.length === 0 && assistantMessages.length === 0) {
    throw new Error(
      `Failed to extract Claude messages: ` +
      `no [data-testid="${CLAUDE_USER_MESSAGE_TESTID}"] or content elements found. ` +
      `Claude may have updated their DOM structure.`
    );
  }
  
  // Simple extraction - text only, no thinking blocks
  document.querySelectorAll('.whitespace-pre-wrap.break-words').forEach((element, index) => {
    const content = element.textContent.trim();
    if (content) {
      messages.push({
        role: 'unknown', // Can't reliably determine from DOM
        content,
        timestamp: new Date().toISOString(),
        index,
        source: 'claude-dom-fallback'
      });
    }
  });
  
  console.log(`[Context Bridge] DOM fallback extracted ${messages.length} messages from Claude`);
  return messages;
}

/**
 * Main extraction router
 * @returns {Promise<Array<Object>>}
 */
async function extractCurrentConversation() {
  if (currentSite === 'chatgpt') {
    return extractChatGPTConversationFromDOM();
  } else if (currentSite === 'claude') {
    return extractClaudeConversationFromAPI();
  } else {
    throw new Error(`Cannot extract conversation: unknown site ${window.location.hostname}`);
  }
}

// Listen for messages from popup (Agent A: message passing architecture)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureContext') {
    extractCurrentConversation()
      .then(messages => {
        sendResponse({ success: true, messages, site: currentSite });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    
    // Return true to keep message channel open for async response
    return true;
  }
  
  if (message.action === 'pushContext') {
    // In v1, we just log this - actual injection would require more work
    console.log('[Context Bridge] Push context requested:', message.context);
    sendResponse({ success: true, message: 'Context push logged (v1 demo)' });
    return true;
  }
});

// Badge: Show sync status (Agent D: visual indicators)
function updateBadgeStatus(status) {
  chrome.runtime.sendMessage({
    action: 'updateBadge',
    status
  });
}

console.log(`[Context Bridge] Content script loaded on ${currentSite}`);
