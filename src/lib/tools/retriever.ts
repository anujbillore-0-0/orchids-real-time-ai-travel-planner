// Force rebuild and use safe initialization
import { TavilySearchAPIRetriever } from "@langchain/community/retrievers/tavily_search_api";
import { YoutubeTranscript } from "youtube-transcript";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { supabase } from "../supabase";

let _embeddings: GoogleGenerativeAIEmbeddings | null = null;
let _searchRetriever: TavilySearchAPIRetriever | null = null;

export function getEmbeddings() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is missing. Please set it in environment variables.");
  }
  if (!_embeddings) {
    _embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey,
      modelName: "text-embedding-004",
      taskType: TaskType.RETRIEVAL_DOCUMENT,
    });
  }
  return _embeddings;
}

export function getSearchRetriever() {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is missing. Please set it in environment variables.");
  }
  if (!_searchRetriever) {
    _searchRetriever = new TavilySearchAPIRetriever({
      apiKey,
      k: 5,
    });
  }
  return _searchRetriever;
}

export async function getYoutubeTranscripts(videoUrl: string) {
  try {
    const videoId = videoUrl.split("v=")[1]?.split("&")[0] || videoUrl.split("/").pop();
    if (!videoId) return "Could not extract video ID";
    
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return transcript.map((t) => t.text).join(" ");
  } catch (error) {
    console.error("Error fetching YouTube transcript:", error);
    return "Failed to fetch transcript. The video might not have captions enabled.";
  }
}

export async function storeDocument(content: string, metadata: any) {
  const embeddings = getEmbeddings();
  const vector = await embeddings.embedQuery(content);
  
  const { error } = await supabase.from("documents").insert({
    content,
    metadata,
    embedding: vector,
  });

  if (error) {
    console.error("Error storing document:", error);
  }
}

export async function searchDocuments(query: string, limit = 5) {
  const embeddings = getEmbeddings();
  const vector = await embeddings.embedQuery(query);
  
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: vector,
    match_threshold: 0.5,
    match_count: limit,
  });

  if (error) {
    console.error("Error searching documents:", error);
    return [];
  }

  return data;
}
