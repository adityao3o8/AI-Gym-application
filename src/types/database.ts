export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "member" | "owner" | "admin";

export type Database = {
  public: {
    Tables: {
      gyms: {
        Row: {
          id: string;
          name: string;
          slug: string;
          address: string | null;
          phone: string | null;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          address?: string | null;
          phone?: string | null;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          address?: string | null;
          phone?: string | null;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gyms_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          gym_id: string | null;
          streak_count: number;
          last_workout_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          gym_id?: string | null;
          streak_count?: number;
          last_workout_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          gym_id?: string | null;
          streak_count?: number;
          last_workout_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_gym_id_fkey";
            columns: ["gym_id"];
            isOneToOne: false;
            referencedRelation: "gyms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "users_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      workouts: {
        Row: {
          id: string;
          user_id: string;
          gym_id: string | null;
          title: string;
          notes: string | null;
          performed_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          gym_id?: string | null;
          title?: string;
          notes?: string | null;
          performed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          gym_id?: string | null;
          title?: string;
          notes?: string | null;
          performed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workouts_gym_id_fkey";
            columns: ["gym_id"];
            isOneToOne: false;
            referencedRelation: "gyms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workouts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_entries: {
        Row: {
          id: string;
          workout_id: string;
          exercise_name: string;
          sets: number;
          reps: number;
          weight_kg: number | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          workout_id: string;
          exercise_name: string;
          sets?: number;
          reps?: number;
          weight_kg?: number | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          workout_id?: string;
          exercise_name?: string;
          sets?: number;
          reps?: number;
          weight_kg?: number | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_entries_workout_id_fkey";
            columns: ["workout_id"];
            isOneToOne: false;
            referencedRelation: "workouts";
            referencedColumns: ["id"];
          },
        ];
      };
      attendance: {
        Row: {
          id: string;
          user_id: string;
          gym_id: string;
          checked_in_at: string;
          checked_out_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          gym_id: string;
          checked_in_at?: string;
          checked_out_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          gym_id?: string;
          checked_in_at?: string;
          checked_out_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_gym_id_fkey";
            columns: ["gym_id"];
            isOneToOne: false;
            referencedRelation: "gyms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      trophies: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          icon: string;
          criteria: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          icon?: string;
          criteria?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          icon?: string;
          criteria?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      user_trophies: {
        Row: {
          id: string;
          user_id: string;
          trophy_id: string;
          earned_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trophy_id: string;
          earned_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          trophy_id?: string;
          earned_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_trophies_trophy_id_fkey";
            columns: ["trophy_id"];
            isOneToOne: false;
            referencedRelation: "trophies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_trophies_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_user_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
      is_gym_staff: {
        Args: { target_gym_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
};

// Convenience aliases
export type Gym = Database["public"]["Tables"]["gyms"]["Row"];
export type UserProfile = Database["public"]["Tables"]["users"]["Row"];
export type Workout = Database["public"]["Tables"]["workouts"]["Row"];
export type WorkoutEntry = Database["public"]["Tables"]["workout_entries"]["Row"];
export type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
export type Trophy = Database["public"]["Tables"]["trophies"]["Row"];
export type UserTrophy = Database["public"]["Tables"]["user_trophies"]["Row"];
