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
    console.log('Evaluator API called');
    const body = await req.json();
    const { message, messages } = body;
    console.log('Evaluator request:', { 
      message, 
      messageCount: messages?.length
    });

    const systemPrompt = `You are an AI math tutor's evaluation system that assesses student understanding.

Analyze the student's response and provide a score from 1-5:
1: Very confused, needs complete re-explanation
2: Struggling but showing some basic understanding
3: Basic understanding with some gaps
4: Good understanding with minor uncertainties
5: Excellent understanding of the concept

IMPORTANT RULES:
1. Focus on understanding, not grammar or politeness
2. Short responses like "idk" or "??" indicate confusion (score 1)
3. Consider context from previous messages
4. Look for signs of conceptual understanding over perfect answers

Provide your assessment as a JSON object with ONLY a score field:
{"score": number}

Example scoring:
"idk" -> {"score": 1}
"it makes a U shape because the x² term" -> {"score": 4}
"i think it's related to speed and distance" -> {"score": 3}`;

    console.log('Evaluator system prompt:', systemPrompt);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages?.slice(-3) || [], // Include last 3 messages for context
        { role: "user", content: message }
      ],
      temperature: 0.3,
      max_tokens: 150,
    });

    const assessmentText = completion.choices[0]?.message?.content || '{}';
    let assessment;
    try {
      assessment = JSON.parse(assessmentText);
    } catch (e) {
      assessment = {
        score: 3 // Default to neutral score
      };
    }

    // Validate score is within range
    if (!assessment.score || assessment.score < 1 || assessment.score > 5) {
      assessment.score = 3; // Default to neutral score if invalid
    }

    return NextResponse.json(assessment);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to process the request' },
      { status: 500 }
    );
  }
}
