# Context Bridge

**Stop copy-pasting between AI tools.** Sync conversation context between ChatGPT, Claude, and other AI chat interfaces.

## The Problem

> "I'm constantly copying information back and forth between ChatGPT and Claude. Every time I switch tools, I basically have to start over."  
> — Real user complaint from 15+ Reddit threads, October 2026

## The Solution

Context Bridge is a browser extension that captures conversation context from AI tools and lets you push it to other tools. No more manual copy-paste.

### Features

- **Capture context** from ChatGPT and Claude with one click
- **Store locally** using IndexedDB (privacy-first, no cloud sync)
- **Manual push** to other tools (user in control)
- **Visual sync status** via badge indicator
- **Privacy-focused** — all data stays in your browser

## Installation

1. Download the extension from [Releases](https://github.com/gmdeo/context-bridge/releases)
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select the `extension` folder

## Usage

1. **Capture:** While on ChatGPT or Claude, click the Context Bridge extension icon and click "Capture Context from This Page"
2. **Switch:** Navigate to the other AI tool
3. **Push:** Click Context Bridge again and click "Push Context" (v1: logs the context, full injection coming in v1.1)

## Architecture

Built with research-grounded design:

- **Manifest V3** with event-driven service worker
- **Quiescence detection** for SPA stability (410ms median vs 1500ms fixed delays)
- **IndexedDB** for full conversation history
- **Claude API-first** approach captures thinking blocks and tool calls DOM scraping misses
- **ChatGPT DOM extraction** using stable `data-message-author-role` selectors

## Research Foundation

Context Bridge was built after comprehensive research:

- **Agent A:** Browser extension architecture (service workers, message passing, storage)
- **Agent B:** DOM scraping patterns for AI chat interfaces
- **Agent C:** Storage strategies and privacy architecture
- **Agent D:** UX patterns and interaction design
- **Agent E:** Code quality standards (exhaustive naming, error messages cite failures)
- **Agent F:** Technical pitfalls and risk mitigation
- **Agent G:** Production readiness criteria

See [RESEARCH.md](../ai-market-research/RESEARCH.md) for full research integration.

## Privacy

- All conversation data stored **locally** in your browser's IndexedDB
- No external servers, no cloud sync, no tracking
- Optional user-controlled encryption (coming in v1.1)
- Open source — verify the code yourself

## Development

```bash
cd extension
# Load unpacked extension in Chrome for development
# Changes to JS files require extension reload
```

## What This Unlocks

The same research and architecture apply to:

- Multi-tool memory systems (Cursor + VS Code + ChatGPT sync)
- Context window warning systems
- AI memory conflict resolution
- Agent reliability infrastructure (23% → 81% with proper error handling)
- Local AI appliances with better UX

## License

MIT

## Built With

- Manifest V3 Browser Extension API
- IndexedDB for storage
- Research-grounded architecture from seven parallel expert agents

---

Part of the Build-a-Day project, October 4, 2026
