// DOM Selectors - Agent B research findings
export const CHATGPT_MESSAGE_AUTHOR_ROLE_ATTRIBUTE = 'data-message-author-role';
export const CHATGPT_MESSAGE_SELECTOR = `[${CHATGPT_MESSAGE_AUTHOR_ROLE_ATTRIBUTE}]`;
export const CHATGPT_MARKDOWN_CONTENT_SELECTOR = '.markdown';
export const CHATGPT_USER_MESSAGE_TESTID = 'user-message';

export const CLAUDE_API_BASE_URL = 'https://claude.ai/api/organizations';
export const CLAUDE_USER_MESSAGE_TESTID = 'user-message';
export const CLAUDE_CONTENT_SELECTOR = '.whitespace-pre-wrap.break-words';

// Timing constants - Agent B research findings
export const DOM_QUIESCENCE_QUIET_MS = 350;
export const DOM_QUIESCENCE_MAX_MS = 3000;
export const STREAMING_STABLE_CHECK_INTERVAL_MS = 200;
export const STREAMING_STABLE_COUNT_THRESHOLD = 3;

// Storage constants - Agent C research findings
export const STORAGE_KEY_CONVERSATIONS = 'conversations';
export const STORAGE_KEY_SETTINGS = 'settings';
export const STORAGE_MAX_CONVERSATIONS = 100;

// Rate limit protection - Agent A research findings
export const CHROME_STORAGE_WRITE_BATCH_DELAY_MS = 500;
export const CHROME_STORAGE_WRITES_PER_MINUTE_LIMIT = 120;
