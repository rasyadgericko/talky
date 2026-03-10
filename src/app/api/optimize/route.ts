import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = "https://hveankwjtfvcztcrurlm.supabase.co";

const SYSTEM_PROMPTS: Record<string, string> = {
  optimize: `You are a dictation-to-AI-prompt converter. The user has spoken a rough idea aloud. Your job:\n1. Identify the user's intent and desired output.\n2. Rewrite their spoken text into a clear, well-structured AI prompt.\n3. Add relevant context, constraints, or formatting instructions that would help an AI produce better output.\n4. Use direct, imperative language (e.g., "Write a...", "Create a...", "Analyze...").\n5. If the dictation mentions a specific format (email, code, essay, list), include format requirements.\nReturn ONLY the optimized prompt. No preamble, no explanation, no quotes around it.`,
  refine: `You are a dictation refiner. The user has spoken text aloud that they want polished into clean, publication-ready prose.\n1. Fix all grammar, spelling, and punctuation errors.\n2. Improve sentence structure and flow while preserving the speaker's voice and intent.\n3. Remove filler words, false starts, and verbal tics (um, uh, like, you know, so, basically).\n4. Maintain the original meaning — do not add new ideas or change the message.\n5. Format appropriately (paragraphs, lists, etc.) based on context.\nReturn ONLY the refined text. No preamble, no explanation.`,
  summarize: `You are a dictation summarizer. The user has spoken at length and needs a concise summary.\n1. Extract the key points, decisions, and action items.\n2. Organize into 3-7 bullet points, most important first.\n3. Use clear, direct language — no filler.\n4. If action items exist, separate them with a header.\n5. Preserve specific names, dates, numbers, and commitments.\nReturn ONLY the summary. No preamble, no explanation.`,
  transform: `You are a text transformer. The user has selected existing text and spoken an instruction for how to change it. Your job:\n1. Apply the user's spoken instruction to the selected text.\n2. Common operations: rewrite, shorten, expand, make formal/casual, translate, fix grammar, change tone, restructure.\n3. If the instruction is ambiguous, make a reasonable interpretation.\n4. Preserve the essential meaning unless told to change it.\nReturn ONLY the transformed text. No preamble, no explanation, no quotes.`,
};

export async function POST(request: NextRequest) {
  try {
    const { text, mode, instruction, history = [], jwt } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Owner mode: call Groq directly with server-side API key
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      const systemPrompt = SYSTEM_PROMPTS[mode || "optimize"];
      if (!systemPrompt) {
        return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
      }

      const messages: Array<{ role: string; content: string }> = [
        { role: "system", content: systemPrompt },
      ];

      if (history && Array.isArray(history)) {
        for (const turn of history) {
          if (turn.role && turn.content) {
            messages.push({ role: turn.role, content: turn.content });
          }
        }
      }

      let userMessage = text;
      if (mode === "transform" && instruction) {
        userMessage = `SELECTED TEXT:\n${text}\n\nINSTRUCTION: ${instruction}`;
      }
      messages.push({ role: "user", content: userMessage });

      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          temperature: 0.3,
          max_tokens: 2048,
        }),
      });

      if (!groqRes.ok) {
        const errText = await groqRes.text();
        throw new Error(`Groq error (${groqRes.status}): ${errText}`);
      }

      const result = await groqRes.json();
      const outputText = result.choices?.[0]?.message?.content || "";
      return NextResponse.json({ result: outputText.trim() });
    }

    // Freemium mode: proxy through Supabase Edge Function
    if (!jwt) {
      return NextResponse.json(
        { error: "Authentication required for AI optimization. Upgrade to Pro." },
        { status: 401 }
      );
    }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/proxy-optimize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, mode, instruction, history }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Proxy error (${res.status})`);
    }

    return NextResponse.json({ result: data.result });
  } catch (error) {
    console.error("Optimization error:", error);

    if (error instanceof Error && error.message) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "Failed to optimize text. Please try again." },
      { status: 500 }
    );
  }
}
