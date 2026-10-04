// Service Worker (Background Script)
// Agent A: Event-driven coordinator, handles message passing and storage
// Agent C: Storage strategy with IndexedDB for full history

import { STORAGE_KEY_CONVERSATIONS, STORAGE_MAX_CONVERSATIONS } from './constants.js';

// IndexedDB setup (Agent C research)
const DB_NAME = 'context-bridge-db';
const DB_VERSION = 1;
let dbConnection = null;

/**
 * Get or create IndexedDB connection
 * @returns {Promise<IDBDatabase>}
 */
async function getDatabase() {
  if (dbConnection) return dbConnection;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('conversations')) {
        const store = db.createObjectStore('conversations', {
          keyPath: 'id',
          autoIncrement: true
        });
        
        store.createIndex('by-timestamp', 'timestamp');
        store.createIndex('by-source', 'source');
        store.createIndex('by-site', 'site');
      }
    };
    
    request.onsuccess = () => {
      dbConnection = request.result;
      console.log('[Context Bridge] IndexedDB connected');
      resolve(dbConnection);
    };
    
    request.onerror = () => {
      console.error('[Context Bridge] IndexedDB connection failed:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Store conversation in IndexedDB (Agent C research)
 * @param {Object} conversation - Conversation data
 * @returns {Promise<number>} ID of stored conversation
 */
async function storeConversationInIndexedDB(conversation) {
  const db = await getDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['conversations'], 'readwrite');
    const store = transaction.objectStore('conversations');
    
    const data = {
      ...conversation,
      timestamp: new Date().toISOString(),
      id: undefined // Let autoIncrement handle it
    };
    
    const request = store.add(data);
    
    request.onsuccess = () => {
      console.log(`[Context Bridge] Stored conversation with ID ${request.result}`);
      resolve(request.result);
    };
    
    request.onerror = () => {
      console.error('[Context Bridge] Failed to store conversation:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Retrieve recent conversations from IndexedDB
 * @param {number} limit - Maximum number to retrieve
 * @returns {Promise<Array>}
 */
async function getRecentConversationsFromIndexedDB(limit = 10) {
  const db = await getDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['conversations'], 'readonly');
    const store = transaction.objectStore('conversations');
    const index = store.index('by-timestamp');
    
    const request = index.openCursor(null, 'prev'); // Descending order
    const results = [];
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    
    request.onerror = () => {
      console.error('[Context Bridge] Failed to retrieve conversations:', request.error);
      reject(request.error);
    };
  });
}

// Message handler (Agent A: message routing)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveContext') {
    storeConversationInIndexedDB(message.data)
      .then(id => {
        sendResponse({ success: true, id });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep channel open for async response
  }
  
  if (message.action === 'getRecentContexts') {
    getRecentConversationsFromIndexedDB(message.limit || 10)
      .then(conversations => {
        sendResponse({ success: true, conversations });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }
  
  if (message.action === 'updateBadge') {
    // Agent D: Visual sync status indicator
    const status = message.status;
    if (status === 'synced') {
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#10b981' }); // green
    } else if (status === 'error') {
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' }); // red
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
    sendResponse({ success: true });
  }
});

console.log('[Context Bridge] Background service worker initialized');
