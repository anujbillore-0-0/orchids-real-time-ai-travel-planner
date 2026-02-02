"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Search, MapPin, Compass, AlertTriangle, Utensils, Hotel, Luggage, Send, Loader2, Copy, Check } from "lucide-react";

export default function Home() {
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);

    const copyToClipboard = async () => {
      if (!itinerary) return;
      
      try {
        // First try the modern Clipboard API
        if (navigator.clipboard && window.isSecureContext) {
          try {
            await navigator.clipboard.writeText(itinerary);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            return;
          } catch (err) {
            console.warn("Navigator clipboard failed, trying fallback", err);
          }
        }

        // Fallback to execCommand('copy')
        const textArea = document.createElement("textarea");
        textArea.value = itinerary;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } else {
            throw new Error("execCommand unsuccessful");
          }
        } catch (err) {
          console.error("Fallback copy failed", err);
          // Last resort: prompt the user to copy manually
          const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
          const key = isMac ? 'Cmd+C' : 'Ctrl+C';
          alert(`Clipboard access denied. Please use ${key} to copy the itinerary manually.`);
        } finally {
          document.body.removeChild(textArea);
        }
      } catch (err) {
        console.error("Critical copy failure", err);
        alert("Unable to copy automatically. Please select the text and copy manually.");
      }
    };

  const generateItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination) return;

    setLoading(true);
    setItinerary(null);
    setStatus("Scraping Reddit and forums for real-time data...");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate itinerary");
      }

      setItinerary(data.itinerary);
    } catch (error: any) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30">
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-24">
        {/* Hero Section */}
        <div className="space-y-6 text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium animate-in fade-in slide-in-from-bottom-3 duration-1000">
            <Compass className="w-4 h-4" />
            <span>AI-Powered Real-Time Travel Agent</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
            Where to next?
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Get "truthful" itineraries based on recent Reddit posts, YouTube vlogs, and forums. No sponsored fluff, just real experiences.
          </p>

          <form onSubmit={generateItinerary} className="relative max-w-xl mx-auto pt-8">
            <div className="relative group">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type="text"
                placeholder="Enter destination (e.g., Udaipur, Rajasthan)"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-32 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-lg"
              />
              <button
                type="submit"
                disabled={loading || !destination}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 text-black font-semibold rounded-xl transition-all flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Plan Trip
              </button>
            </div>
          </form>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-in fade-in duration-500">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              <Compass className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-emerald-500 animate-pulse" />
            </div>
            <p className="text-zinc-400 font-medium animate-pulse">{status}</p>
          </div>
        )}

        {/* Itinerary Result */}
        {itinerary && !loading && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="relative p-8 md:p-12 bg-zinc-900/50 border border-zinc-800 rounded-3xl backdrop-blur-sm shadow-2xl group/itinerary">
              <button
                onClick={copyToClipboard}
                className="absolute right-6 top-6 p-2 rounded-xl bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-all text-zinc-400 hover:text-white flex items-center gap-2 text-sm"
                title="Copy itinerary"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
              <article className="prose prose-invert prose-emerald max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h1 className="text-3xl font-bold mb-6 text-white border-b border-zinc-800 pb-4">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-2xl font-semibold mt-10 mb-4 text-emerald-400 flex items-center gap-2">{children}</h2>,
                    p: ({ children }) => <p className="text-zinc-400 leading-relaxed mb-4">{children}</p>,
                    ul: ({ children }) => <ul className="space-y-2 mb-6 list-none pl-0">{children}</ul>,
                    li: ({ children }) => (
                      <li className="flex gap-3 text-zinc-400">
                        <span className="text-emerald-500 mt-1.5">•</span>
                        <span>{children}</span>
                      </li>
                    ),
                    blockquote: ({ children }) => (
                      <div className="my-6 p-4 bg-emerald-500/5 border-l-4 border-emerald-500 rounded-r-xl italic text-zinc-300">
                        {children}
                      </div>
                    ),
                  }}
                >
                  {itinerary}
                </ReactMarkdown>
              </article>
            </div>

            {/* Quick Tips Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
                <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-white">Scam Alert</h3>
                <p className="text-sm text-zinc-400">Verify all transport prices and avoid "free" guides suggested in reviews.</p>
              </div>
              <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                  <Utensils className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-white">Local Food</h3>
                <p className="text-sm text-zinc-400">Check recent forum posts for "hole-in-the-wall" spots that aren't on Google Maps.</p>
              </div>
              <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400">
                  <Luggage className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-white">Smart Packing</h3>
                <p className="text-sm text-zinc-400">Pack according to real-time weather updates shared by recent travelers.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>
    </div>
  );
}
