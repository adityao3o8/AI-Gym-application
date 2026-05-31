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
          logo_url: string | null;
          primary_color: string | null;
          check_in_code: string | null;
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
          logo_url?: string | null;
          primary_color?: string | null;
          check_in_code?: string | null;
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
          logo_url?: string | null;
          primary_color?: string | null;
          check_in_code?: string | null;
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
          injury_flags: string[];
          rest_tokens: number;
          gym_cred: number;
          season_xp: number;
          division: string;
          accountability_partner_id: string | null;
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
          injury_flags?: string[];
          rest_tokens?: number;
          gym_cred?: number;
          season_xp?: number;
          division?: string;
          accountability_partner_id?: string | null;
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
          injury_flags?: string[];
          rest_tokens?: number;
          gym_cred?: number;
          season_xp?: number;
          division?: string;
          accountability_partner_id?: string | null;
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
          form_score: number | null;
          reps_detected: number | null;
          exercise_detected: string | null;
          source: string;
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
          form_score?: number | null;
          reps_detected?: number | null;
          exercise_detected?: string | null;
          source?: string;
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
          form_score?: number | null;
          reps_detected?: number | null;
          exercise_detected?: string | null;
          source?: string;
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
      seasons: {
        Row: {
          id: string;
          name: string;
          starts_at: string;
          ends_at: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          starts_at: string;
          ends_at: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          starts_at?: string;
          ends_at?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      gym_challenges: {
        Row: {
          id: string;
          gym_id: string;
          created_by: string;
          title: string;
          description: string | null;
          challenge_type: string;
          target_value: number;
          starts_at: string;
          ends_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          created_by: string;
          title: string;
          description?: string | null;
          challenge_type?: string;
          target_value?: number;
          starts_at?: string;
          ends_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          created_by?: string;
          title?: string;
          description?: string | null;
          challenge_type?: string;
          target_value?: number;
          starts_at?: string;
          ends_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      challenge_participants: {
        Row: {
          id: string;
          challenge_id: string;
          user_id: string;
          progress: number;
          completed_at: string | null;
          joined_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          user_id: string;
          progress?: number;
          completed_at?: string | null;
          joined_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          user_id?: string;
          progress?: number;
          completed_at?: string | null;
          joined_at?: string;
        };
        Relationships: [];
      };
      gym_feed_posts: {
        Row: {
          id: string;
          gym_id: string;
          user_id: string;
          body: string;
          post_type: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          user_id: string;
          body: string;
          post_type?: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          user_id?: string;
          body?: string;
          post_type?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      gym_hall_of_fame: {
        Row: {
          id: string;
          gym_id: string;
          user_id: string;
          exercise_name: string;
          weight_kg: number;
          reps: number;
          achieved_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          user_id: string;
          exercise_name: string;
          weight_kg: number;
          reps?: number;
          achieved_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          user_id?: string;
          exercise_name?: string;
          weight_kg?: number;
          reps?: number;
          achieved_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      gym_equipment: {
        Row: {
          id: string;
          gym_id: string;
          name: string;
          zone: string;
          capacity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          name: string;
          zone?: string;
          capacity?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          name?: string;
          zone?: string;
          capacity?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      equipment_usage: {
        Row: {
          id: string;
          equipment_id: string;
          user_id: string;
          started_at: string;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          equipment_id: string;
          user_id: string;
          started_at?: string;
          ended_at?: string | null;
        };
        Update: {
          id?: string;
          equipment_id?: string;
          user_id?: string;
          started_at?: string;
          ended_at?: string | null;
        };
        Relationships: [];
      };
      ghost_sessions: {
        Row: {
          id: string;
          user_id: string;
          exercise: string;
          reps: number;
          form_score: number | null;
          metrics: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exercise: string;
          reps?: number;
          form_score?: number | null;
          metrics?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          exercise?: string;
          reps?: number;
          form_score?: number | null;
          metrics?: Json;
          created_at?: string;
        };
        Relationships: [];
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
