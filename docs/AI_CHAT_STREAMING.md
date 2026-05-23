# Advanced AI Chat Streaming + Typing Effect System

Production-grade streaming chat for Cookie Bite — ChatGPT-like UX with SSE, human typing, Markdown, and abort/retry.

## Stack

| Layer | Technology |
|--------|------------|
| Framework | Next.js 16 App Router |
| UI | React 19, Tailwind CSS 4, **motion** (Framer Motion API) |
| Markdown | `react-markdown`, `remark-gfm`, `rehype-highlight` |
| AI | **Gemini** (primary — Mr. Brownie) · **OpenAI** (optional — `/api/chat`) |
| Transport | SSE (`text/event-stream`) via `ReadableStream` |

## Project structure

```
config/chatbot.config.json          # JSON configuration (typing, streaming, theme)
lib/ai-chat/
  config.ts                         # Typed config loader
  types.ts                          # Message + stream event types
  typing-delays.ts                  # Human-like delay calculator
  stream-parser.ts                  # SSE / plain stream parser
  markdown.ts                       # Shared prose classes
  providers/openai-stream.ts        # OpenAI streaming route helper
lib/mr-brownie/
  gemini-stream.ts                  # Gemini token stream
  prepare-chat.ts                   # Shared Mr. Brownie context builder
  stream-client.ts                  # Browser client for Mr. Brownie SSE
hooks/
  use-chat-stream.ts                # Generic chat hook (abort, retry, queue)
  use-typing-effect.ts              # Smooth character display
components/ai-chat/
  ai-chat-app.tsx                   # Full demo shell
  chat-window.tsx                   # Auto-scroll container
  chat-input.tsx                    # Send / stop / retry
  message-bubble.tsx                # Markdown bubble + cursor + copy
  markdown-renderer.tsx
  typing-effect.tsx / cursor.tsx
app/api/chat/route.ts               # Generic streaming chat (OpenAI → Gemini fallback)
app/api/mr-brownie/chat/stream/route.ts
app/(site)/demo/ai-chat/page.tsx    # Standalone demo UI
app/styles/ai-chat.css              # Cursor blink + code blocks
```

## Configuration (`config/chatbot.config.json`)

All UX tuning lives in one JSON file:

- **typing** — min/max delay, punctuation/newline pauses, humanize toggle
- **streaming** — chunk size, smooth streaming, SSE flag
- **cursor** — blink speed, glyph
- **animations** — fade, smooth scroll, bubble motion
- **markdown** — live rendering, syntax highlight
- **mobile** — responsive + safe-area padding
- **theme** — default + toggle

Edit the file and redeploy — no code changes required for timing tweaks.

## API routes

### `POST /api/chat`

Generic assistant for demo / internal tools.

- Body: `{ messages: [{ role, content }], system?: string }`
- Response: SSE events:
  - `{ "type": "token", "content": "..." }`
  - `{ "type": "done", "meta": { provider, model } }`
  - `{ "type": "error", "message": "..." }`
- Provider order: `OPENAI_API_KEY` → else `GEMINI_API_KEY`

### `POST /api/mr-brownie/chat/stream`

Storefront assistant with full Cookie Bite context (role, cart, orders).

Same SSE format. Uses `prepareMrBrownieChat()` + Gemini streaming.

Legacy non-streaming endpoint remains at `/api/mr-brownie/chat`.

## Client hooks

### `useChatStream`

```tsx
const { messages, send, abort, retry, isStreaming } = useChatStream({
  endpoint: "/api/chat",
  buildBody: (messages, userMessage) => ({ messages }),
  onComplete: (msg) => console.log(msg.content),
});
```

Features: AbortController, retry last turn, message queue while streaming, bilingual errors.

### `useTypingEffect`

Feeds displayed text from a growing `target` string with configurable human delays.

## UI components

| Component | Role |
|-----------|------|
| `AiChatApp` | Full page chat shell + theme toggle |
| `ChatWindow` | Smooth auto-scroll |
| `MessageBubble` | User/assistant bubbles, Markdown, blinking cursor while streaming |
| `ChatInput` | Enter to send, Stop (square), Retry |
| `TypingIndicator` | Three-dot bounce before first token |

## Mr. Brownie integration

`components/mr-brownie/mr-brownie-chat.tsx` now:

1. Calls `streamMrBrownieChat()` instead of waiting for full JSON
2. Renders assistant messages with `MessageBubble` (Markdown + typing)
3. Send button becomes **Stop** while generating (AbortController)

## Environment variables

```env
GEMINI_API_KEY=...                    # Required for Mr. Brownie stream
MR_BROWNIE_GEMINI_MODEL=gemini-flash-latest
OPENAI_API_KEY=...                    # Optional — enables /api/chat via OpenAI
OPENAI_CHAT_MODEL=gpt-4o-mini         # Optional override
```

## Demo

Local: [http://localhost:3000/demo/ai-chat](http://localhost:3000/demo/ai-chat)

Production: `https://cookie-bite.com/demo/ai-chat` (after deploy)

## Performance notes

- `MessageBubble` and `MarkdownRenderer` are memoized
- Markdown re-renders on each token when `liveRendering` is true (trade-off for live code blocks)
- For very long chats, consider virtualizing `ChatWindow` (optional future work)
- Never poll — always use streaming `fetch` + `ReadableStream`

## Optional extensions (not yet implemented)

Voice I/O, file upload in generic chat, multi-model picker, virtualized history, reasoning indicator.

---

See also: `docs/mr-brownie-platform-intelligence-v2.1.md` for Mr. Brownie security and role rules.
