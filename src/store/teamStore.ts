"use client";
import { create } from "zustand";
import type { Team, TeamSlot, AgentPersonality } from "@/types";

type TeamStore = {
  team: Team | null;
  setTeam: (team: Team) => void;
  updateSlot: (slotIndex: number, slot: Partial<TeamSlot>) => void;
  setAgentPersonality: (slotIndex: number, personality: AgentPersonality) => void;
  clearTeam: () => void;
};

export const useTeamStore = create<TeamStore>((set) => ({
  team: null,

  setTeam: (team) => set({ team }),

  updateSlot: (slotIndex, slotUpdate) =>
    set((s) => {
      if (!s.team) return s;
      const slots = s.team.slots.map((slot) =>
        slot.slotIndex === slotIndex ? { ...slot, ...slotUpdate } : slot
      );
      return { team: { ...s.team, slots } };
    }),

  setAgentPersonality: (slotIndex, personality) =>
    set((s) => {
      if (!s.team) return s;
      const slots = s.team.slots.map((slot) =>
        slot.slotIndex === slotIndex
          ? { ...slot, type: "agent" as const, agentPersonality: personality }
          : slot
      );
      return { team: { ...s.team, slots } };
    }),

  clearTeam: () => set({ team: null }),
}));
