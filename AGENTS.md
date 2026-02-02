## Project Summary
An end-to-end AI travel agent that generates truthful itineraries by scraping real-time data from Reddit, YouTube transcripts, Quora, and travel forums. It uses RAG (Retrieval-Augmented Generation) to store and retrieve recent travel advice, ensuring users get non-sponsored, realistic information.

## Tech Stack
- **Framework**: Next.js (App Router), LangGraph.js
- **LLM**: Groq (Llama 3.3 70B) for fast, free reasoning
- **Search/Scraping**: Tavily (Reddit/Quora/Forums), `youtube-transcript` (YouTube vlogs)
- **Database**: Supabase (pgvector) for vector storage and RAG
- **Embeddings**: Google Gemini (text-embedding-004) - Free tier
- **Styling**: Tailwind CSS, Lucide React

## Architecture
- `src/lib/agent/`: LangGraph state machine logic.
- `src/lib/tools/`: Custom tools for web searching, transcript fetching, and database operations.
- `src/app/api/chat/`: Endpoint to trigger the travel agent workflow.
- `src/lib/supabase.ts`: Supabase client configuration.

## User Preferences
- **Completely Free**: Uses free tiers of Groq, Tavily, Gemini, and Supabase.
- **Truthful Data**: Prioritizes forums and vlogs over sponsored travel sites.
- **Modern UI**: Dark theme with emerald accents.

## Project Guidelines
- Use relative URLs for client-side API calls.
- Avoid localhost in any code meant for deployment.
- No comments in code unless explicitly requested.

## Common Patterns
- **RAG Flow**: Check DB -> Search Web -> Fetch Transcripts -> Store in DB -> Generate Synthesis.
- **Tooling**: LangChain community tools combined with custom scrapers.
