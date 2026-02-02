import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { Document } from "@langchain/core/documents";
import { getSearchRetriever, getYoutubeTranscripts, searchDocuments, storeDocument } from "../tools/retriever";

// Define the state
export const AgentState = Annotation.Root({
  destination: Annotation<string>(),
  documents: Annotation<Document[]>({
    reducer: (x, y) => [...x, ...y],
    default: () => [],
  }),
  itinerary: Annotation<string>(),
  query: Annotation<string>(),
});

const getLLM = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing. Please set it in environment variables.");
  }
  return new ChatGroq({
    apiKey,
    model: "llama-3.3-70b-versatile",
    temperature: 0,
  });
};

// Nodes
async function retrieveFromDB(state: typeof AgentState.State) {
  const docs = await searchDocuments(state.query);
  const formattedDocs = docs.map((d: any) => new Document({
    pageContent: d.content,
    metadata: d.metadata
  }));
  return { documents: formattedDocs };
}

async function webSearch(state: typeof AgentState.State) {
  const searchRetriever = getSearchRetriever();
  // Specifically search for reddit, quora, and recent forums
  const searchQueries = [
    `${state.destination} trip itinerary reddit 2024 2025`,
    `${state.destination} travel guide quora recent`,
    `${state.destination} things to avoid scams reddit`,
    `${state.destination} budget transport price 2024`,
  ];
  
  const allDocs: Document[] = [];
  for (const q of searchQueries) {
    const docs = await searchRetriever.invoke(q);
    allDocs.push(...docs);
  }
  
  // Store these in DB for future RAG
  for (const doc of allDocs) {
    await storeDocument(doc.pageContent, { ...doc.metadata, source: "web_search", destination: state.destination });
  }

  return { documents: allDocs };
}

async function youtubeSearch(state: typeof AgentState.State) {
  const searchRetriever = getSearchRetriever();
  // Use Tavily to find relevant youtube links first
  const youtubeLinks = await searchRetriever.invoke(`${state.destination} travel vlog 2024 2025 youtube`);
  
  const transcripts: Document[] = [];
  // Limit to top 2 videos for speed/token limits
  const videos = youtubeLinks.filter(d => d.metadata.url?.includes("youtube.com/watch") || d.metadata.url?.includes("youtu.be")).slice(0, 2);
  
  for (const video of videos) {
    const text = await getYoutubeTranscripts(video.metadata.url);
    if (text && !text.startsWith("Failed")) {
      const doc = new Document({
        pageContent: text,
        metadata: { source: "youtube", url: video.metadata.url, destination: state.destination }
      });
      transcripts.push(doc);
      await storeDocument(text, doc.metadata);
    }
  }

  return { documents: transcripts };
}

async function generateItinerary(state: typeof AgentState.State) {
  const llm = getLLM();
  const prompt = ChatPromptTemplate.fromTemplate(`
    You are an expert travel AI agent. Your goal is to create a detailed, "truthful" itinerary for {destination} based on real-time data from Reddit, Quora, and YouTube.
    
    Data retrieved from forums and vlogs:
    {context}
    
    Requirements for the itinerary:
    1. Places to visit (hidden gems vs tourist traps)
    2. Transportation: How to get around, average prices per km/way (current for 2024-2025)
    3. Scams to avoid: Real warnings from recent travelers
    4. Food: Best local spots, street food, budget options
    5. Accommodation: Best areas for hostels/budget hotels
    6. Packing list: Things to carry based on recent weather/conditions
    7. Daily breakdown for a 3-4 day trip
    
    Focus on being realistic and avoiding "sponsored" advice.
    
    Itinerary:
  `);

  const chain = prompt.pipe(llm).pipe(new StringOutputParser());
  
  const context = state.documents.map(d => `Source: ${d.metadata.source || 'Unknown'}\nContent: ${d.pageContent.substring(0, 1000)}`).join("\n\n");
  
  const result = await chain.invoke({
    destination: state.destination,
    context: context,
  });

  return { itinerary: result };
}

// Build the graph
const workflow = new StateGraph(AgentState)
  .addNode("retrieveFromDB", retrieveFromDB)
  .addNode("webSearch", webSearch)
  .addNode("youtubeSearch", youtubeSearch)
  .addNode("generateItinerary", generateItinerary)
  .addEdge(START, "retrieveFromDB")
  .addConditionalEdges("retrieveFromDB", (state) => {
    // If we have enough docs in DB, go to generate, else search web
    return state.documents.length > 5 ? "generateItinerary" : "webSearch";
  })
  .addEdge("webSearch", "youtubeSearch")
  .addEdge("youtubeSearch", "generateItinerary")
  .addEdge("generateItinerary", END);

export const app = workflow.compile();
