import { z } from "zod";

export const createTeamSchema = z.object({
  teamName: z.string().min(2).max(50),
  maxSize: z.number().int().min(2).max(6),
  creatorName: z.string().min(1).max(50),
  slotConfigs: z
    .array(
      z.object({
        slotIndex: z.number().int().min(1).max(5),
        type: z.enum(["human", "agent"]),
        agentPersonality: z
          .enum(["supportive", "spoon_feeder", "supervisor", "friendly"])
          .optional(),
      })
    )
    .optional(),
});

export const joinTeamSchema = z.object({
  inviteCode: z.string().min(6).max(6),
  displayName: z.string().min(1).max(50),
});

export const joinSlotSchema = z.object({
  slotIndex: z.number().int().min(0).max(5),
  type: z.enum(["human", "agent"]),
  agentPersonality: z
    .enum(["supportive", "spoon_feeder", "supervisor", "friendly"])
    .optional(),
  displayName: z.string().min(1).max(50),
});

export const submitAnswerSchema = z.object({
  puzzleId: z.string().min(1),
  answer: z.union([z.string(), z.record(z.string(), z.string()), z.array(z.array(z.number()))]),
  timeTakenSeconds: z.number().int().min(0),
  hintsUsed: z.number().int().min(0),
});

export const agentChatSchema = z.object({
  sessionId: z.string().uuid(),
  puzzleId: z.string().min(1),
  agentPersonality: z.enum(["supportive", "spoon_feeder", "supervisor", "friendly"]),
  playerAttempt: z.string().max(2000).optional(),
  timeRemainingSeconds: z.number().int().min(0),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000),
      })
    )
    .max(20),
});

export const hintRequestSchema = z.object({
  puzzleId: z.string().min(1),
  sessionId: z.string().uuid(),
  playerAttempt: z.string().max(2000),
  agentPersonality: z.enum(["supportive", "spoon_feeder", "supervisor", "friendly"]),
  hintsUsed: z.number().int().min(0),
});
