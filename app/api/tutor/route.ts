import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OpenAI API Key');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const { message, messages } = await req.json();
    console.log('Received request:', { message });

    const systemPrompt = `You are a friendly and engaging math tutor specializing in quadratic equations.

KEY RULES:
1. Keep messages SHORT - 1-2 sentences max
2. Be casual and friendly, like texting
3. If student seems confused, break into smaller steps
4. Ask ONE question at a time
5. Give lots of encouragement
6. Never lecture or give long explanations
7. If student says "idk" or is stuck, give a simple hint
8. Use real-world examples when possible

You are teaching about:
- What quadratic equations are
- Why they make U-shaped graphs
- How to find their roots
- Real-world applications

Avoid mathematical notation unless specifically discussing an equation.`;

    // Special handling for session start
    const startPrompt = `You are starting a friendly chat about quadratic equations.

RULES:
1. Start with ONE short greeting
2. Ask ONE simple opening question
3. Keep it super casual
4. Don't explain the format
5. Make it fun!

Example good response:
"Hey there! 👋 Ever seen a U-shaped curve in real life?"

Example bad response (TOO LONG):
"Hello! I'm your math tutor for today's session on quadratic equations. We'll be exploring various concepts including..."`;

    let messageList = [
      {
        role: 'system',
        content: message === 'START_SESSION' ? startPrompt : systemPrompt,
      },
    ];

    if (messages && Array.isArray(messages)) {
      messageList = messageList.concat(messages);
    }

    if (message !== 'START_SESSION') {
      messageList.push({
        role: 'user',
        content: message,
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messageList,
      temperature: 0.8,
      max_tokens: 150, // Shorter responses
    });

    const reply = completion.choices[0].message.content;

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to get response from OpenAI' },
      { status: 500 }
    );
  }
}
