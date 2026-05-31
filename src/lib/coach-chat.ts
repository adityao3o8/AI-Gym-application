import type { CoachEntry } from "@/lib/ai-coach";
import { generatePlan } from "@/lib/ai-coach";
import { injurySwapSuggestions, parseInjuryFlags } from "@/lib/injury-coach";

export type ChatMessage = { role: "user" | "coach"; text: string };

export function coachReply(
  question: string,
  entries: CoachEntry[],
  ctx: {
    streak: number;
    gymCred: number;
    injuries: string[];
    workoutCount: number;
  }
): string {
  const q = question.toLowerCase().trim();
  const injuries = parseInjuryFlags(ctx.injuries);
  const plan = generatePlan(entries);

  if (q.includes("plateau") || q.includes("stuck")) {
    return `Plateaus usually mean you need a change in stimulus. Your coach suggests a ${plan.focus} focus this week. Try varying rep ranges (6–8 heavy or 12–15 volume) and ensure you're hitting ${plan.suggestions[0]?.exercise ?? "a compound lift"} with progressive overload. Current streak: ${ctx.streak} days — consistency beats perfection.`;
  }

  if (q.includes("injury") || q.includes("sore") || q.includes("hurt")) {
    const swaps = injurySwapSuggestions(injuries);
    if (injuries.length === 0) {
      return "You haven't flagged any injury areas in your profile yet. Go to Profile → Injury-aware training to mark sore spots. I'll automatically swap risky exercises in your plan.";
    }
    return `With your flagged areas (${injuries.join(", ")}), avoid heavy loading on those joints. Safer options: ${swaps.join(", ")}. When in doubt, reduce load 20% and prioritize pain-free ROM.`;
  }

  if (q.includes("next") || q.includes("what should") || q.includes("train")) {
    const top = plan.suggestions.slice(0, 3).map((s) => s.exercise).join(", ");
    return `${plan.headline}. ${plan.rationale} Top picks: ${top}.`;
  }

  if (q.includes("streak") || q.includes("motivat")) {
    return `You're on a ${ctx.streak}-day streak with ${ctx.workoutCount} total sessions logged. Gym Cred: ${ctx.gymCred}. ${ctx.streak >= 7 ? "Week Warrior energy — keep showing up." : "Stack small wins — one session today keeps the chain alive."}`;
  }

  if (q.includes("form") || q.includes("video")) {
    return "Use AI Form Check under Coach — upload a side-view clip. You'll get rep count, tempo analysis, fatigue detection, and a form score. Save it directly to your workout log when you're done.";
  }

  if (q.includes("cred") || q.includes("score")) {
    return `Your Gym Cred is ${ctx.gymCred}. It blends streak, workouts, trophies, check-ins, form scores, and season XP. Check the Season page to see your division and progress toward the next tier.`;
  }

  return `Based on your ${entries.length} recent exercise entries: ${plan.rationale} Ask me about plateaus, injuries, your next session, form check, or streaks — I use your actual training data, not generic advice.`;
}
