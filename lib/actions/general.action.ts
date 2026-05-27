'use server'

import { feedbackSchema } from "@/constants";
import { prisma } from "@/lib/prisma";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";

export async function getInterviewsByUserId(userId: string) {
    const interviews = await prisma.interview.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });

    return interviews;
}

export async function getLatestInterviews(params: { userId: string, limit?: number }) {
    const { userId, limit = 20 } = params;

    const interviews = await prisma.interview.findMany({
        where: { 
            userId: { not: userId },
            finalized: true 
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });

    return interviews;
}

export async function getInterviewById(id: string) {
    const interview = await prisma.interview.findUnique({
        where: { id }
    });

    return interview;
}

export async function CreateFeedback(params: { interviewId: string, userId: string, transcript: { role: string; content: string }[] }) {
  const { interviewId, userId, transcript } = params;

  try {
    const formattedTranscript = transcript
      .map((sentence) => `- ${sentence.role}: ${sentence.content}\n`)
      .join('');

    const generated = await generateObject({
      model: google('gemini-2.0-flash-001', {
        structuredOutputs: false,
      }),
      schema: feedbackSchema,
      prompt: `
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
        Transcript:
        ${formattedTranscript}

        Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
        - **Communication Skills**: Clarity, articulation, structured responses.
        - **Technical Knowledge**: Understanding of key concepts for the role.
        - **Problem-Solving**: Ability to analyze problems and propose solutions.
        - **Cultural & Role Fit**: Alignment with company values and job role.
        - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.
      `,
      system:
        "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
    });

    if (!generated || !generated.object) {
      throw new Error('Invalid response from generateObject');
    }

    const {
      totalScore,
      categoryScores,
      strengths,
      areasForImprovement,
      finalAssessment,
    } = generated.object;

    const feedback = await prisma.feedback.create({
      data: {
        interviewId,
        userId,
        totalScore,
        categoryScores: categoryScores as any,
        strengths,
        areasForImprovement,
        finalAssessment,
      }
    });

    return {
      success: true,
      feedbackId: feedback.id,
    };
  } catch (e) {
    console.error('Error saving feedback', e);
    return { success: false };
  }
}

export async function GetFeedbackByInterviewId(params: { interviewId: string, userId: string }) {
    const { interviewId, userId } = params;

    const feedback = await prisma.feedback.findFirst({
        where: {
            interviewId,
            userId,
        },
        orderBy: { createdAt: 'desc' },
    });

    if (!feedback) return null;

    return feedback;
}
