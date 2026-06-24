import { z } from "zod";

const PATH_IDS = [
  "cs_algorithms","cs_theory","cs_discrete_math","cs_os_compilers",
  "cs_networks","cs_cybersecurity","cs_ml_ai","cs_databases",
  "cs_data_science","cs_software_engineering","cs_graphics","cs_hci",
  "gmat_quant","gmat_verbal","gmat_data_insights","cs_random","gmat_full_test",
  "gmat_test_1","gmat_test_2","gmat_test_3","gmat_test_4","gmat_test_5",
  "gmat_test_6","gmat_test_7","gmat_test_8","gmat_test_9","gmat_test_10",
  "gmat_quant_arithmetic","gmat_quant_algebra","gmat_quant_geometry",
  "gmat_quant_word_problems","gmat_quant_number_theory","gmat_quant_statistics",
  "gmat_quant_combinatorics","gmat_quant_coordinate_geo","gmat_quant_functions",
  "gmat_quant_probability",
] as const;

export const createTeamSchema = z.object({
  teamName: z.string().min(2).max(50),
  maxSize: z.number().int().min(1).max(6),
  creatorName: z.string().min(1).max(50),
  selectedPath: z.enum(PATH_IDS).optional(),
  gameTrack: z.enum(["team", "race"]).optional(),
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
