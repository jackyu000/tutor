import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { syllabus } from '@/app/data/syllabus';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OpenAI API Key');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, currentStep, messages } = body;

    const currentStepData = syllabus.steps.find(step => step.id === currentStep);
    if (!currentStepData) {
      throw new Error('Invalid step');
    }

    const systemPrompt = `You are an AI evaluator assessing student understanding of Second-Order Polynomials.
Your task is to score the student's response on a scale of 1-5, where:
1: No understanding
2: Basic understanding with significant gaps
3: Moderate understanding
4: Good understanding with minor gaps
5: Complete understanding

Current topic: ${currentStepData.title}
Expected concepts: ${currentStepData.expected_answers.join(', ')}

Provide your evaluation as a JSON object with:
- score: number (1-5)
- reasoning: brief explanation
- proceed: boolean (whether to move to next step)`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
        { role: "user", content: message }
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const evaluationText = completion.choices[0]?.message?.content || '{}';
    let evaluation;
    try {
      evaluation = JSON.parse(evaluationText);
    } catch (e) {
      evaluation = {
        score: 3,
        reasoning: "Could not parse evaluation",
        proceed: false
      };
    }

    return NextResponse.json(evaluation);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to process the request' },
      { status: 500 }
    );
  }
}
