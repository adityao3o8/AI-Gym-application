"use client";

import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";

type Row = {
  id: number;
  name: string;
  sets: string;
  reps: string;
  weight: string;
};

type WorkoutFormProps = {
  action: (formData: FormData) => Promise<void>;
};

let rowSeq = 1;
const newRow = (): Row => ({
  id: rowSeq++,
  name: "",
  sets: "3",
  reps: "10",
  weight: "",
});

export function WorkoutForm({ action }: WorkoutFormProps) {
  const [rows, setRows] = useState<Row[]>([newRow()]);

  function updateRow(id: number, key: keyof Row, value: string) {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [key]: value } : row))
    );
  }

  function removeRow(id: number) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((row) => row.id !== id)));
  }

  return (
    <GlassCard className="p-5 sm:p-6">
      <form action={action} className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium text-white/80">
              Workout title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="Push Day"
              className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus-visible:border-blue-500/50 focus-visible:ring-2 focus-visible:ring-blue-500/50"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium text-white/80">
              Notes (optional)
            </label>
            <input
              id="notes"
              name="notes"
              type="text"
              placeholder="Felt strong today"
              className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus-visible:border-blue-500/50 focus-visible:ring-2 focus-visible:ring-blue-500/50"
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-white/80">Exercises</p>
          <div className="space-y-2">
            {rows.map((row, index) => (
              <motion.div
                key={row.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-12 gap-2 rounded-xl border border-white/10 bg-white/5 p-2"
              >
                <input
                  name="exercise_name"
                  value={row.name}
                  onChange={(e) => updateRow(row.id, "name", e.target.value)}
                  placeholder={`Exercise ${index + 1}`}
                  className="col-span-12 h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 sm:col-span-5"
                  required
                />
                <input
                  name="sets"
                  value={row.sets}
                  onChange={(e) => updateRow(row.id, "sets", e.target.value)}
                  type="number"
                  min={1}
                  placeholder="Sets"
                  className="col-span-4 h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 sm:col-span-2"
                />
                <input
                  name="reps"
                  value={row.reps}
                  onChange={(e) => updateRow(row.id, "reps", e.target.value)}
                  type="number"
                  min={1}
                  placeholder="Reps"
                  className="col-span-4 h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 sm:col-span-2"
                />
                <input
                  name="weight_kg"
                  value={row.weight}
                  onChange={(e) => updateRow(row.id, "weight", e.target.value)}
                  type="number"
                  min={0}
                  step="0.5"
                  placeholder="kg"
                  className="col-span-3 h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 sm:col-span-2"
                />
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="col-span-1 flex h-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-red-300"
                  aria-label="Remove exercise"
                >
                  <Trash2 className="size-4" />
                </button>
              </motion.div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, newRow()])}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10"
          >
            <Plus className="size-3" />
            Add exercise
          </button>
        </div>

        <Button variant="primary" type="submit" className="h-11 w-full rounded-xl">
          Save workout
        </Button>
      </form>
    </GlassCard>
  );
}
