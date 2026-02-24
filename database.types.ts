export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      food: {
        Row: {
          aisle: string | null
          brand_name: string | null
          created_at: string
          fat_secret_id: number | null
          food_name: string
          food_type: Database["public"]["Enums"]["food_type"]
          id: string
          image_url: string | null
          spoonacular_id: number | null
          user_id: string | null
        }
        Insert: {
          aisle?: string | null
          brand_name?: string | null
          created_at?: string
          fat_secret_id?: number | null
          food_name: string
          food_type?: Database["public"]["Enums"]["food_type"]
          id?: string
          image_url?: string | null
          spoonacular_id?: number | null
          user_id?: string | null
        }
        Update: {
          aisle?: string | null
          brand_name?: string | null
          created_at?: string
          fat_secret_id?: number | null
          food_name?: string
          food_type?: Database["public"]["Enums"]["food_type"]
          id?: string
          image_url?: string | null
          spoonacular_id?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      food_entry: {
        Row: {
          created_at: string
          date: string
          food_id: string | null
          id: string
          meal_type: Database["public"]["Enums"]["meal_type_enum"]
          recipe_id: string | null
          serving_id: string | null
          type: Database["public"]["Enums"]["food_entry_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          food_id?: string | null
          id?: string
          meal_type?: Database["public"]["Enums"]["meal_type_enum"]
          recipe_id?: string | null
          serving_id?: string | null
          type: Database["public"]["Enums"]["food_entry_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          food_id?: string | null
          id?: string
          meal_type?: Database["public"]["Enums"]["meal_type_enum"]
          recipe_id?: string | null
          serving_id?: string | null
          type?: Database["public"]["Enums"]["food_entry_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_entry_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "food"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_entry_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_entry_serving_id_fkey"
            columns: ["serving_id"]
            isOneToOne: false
            referencedRelation: "serving"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient: {
        Row: {
          created_at: string
          food_id: string | null
          id: string
          meta: string | null
          name: string | null
          number_of_servings: number | null
          order: number
          original_name: string | null
          recipe_id: string
          serving_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          food_id?: string | null
          id?: string
          meta?: string | null
          name?: string | null
          number_of_servings?: number | null
          order: number
          original_name?: string | null
          recipe_id: string
          serving_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          food_id?: string | null
          id?: string
          meta?: string | null
          name?: string | null
          number_of_servings?: number | null
          order?: number
          original_name?: string | null
          recipe_id?: string
          serving_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "food"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_serving_id_fkey"
            columns: ["serving_id"]
            isOneToOne: false
            referencedRelation: "serving"
            referencedColumns: ["id"]
          },
        ]
      }
      instruction: {
        Row: {
          created_at: string
          id: string
          name: string | null
          order: number
          recipe_id: string
          type: string
          user_id: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          order: number
          recipe_id: string
          type?: string
          user_id: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          order?: number
          recipe_id?: string
          type?: string
          user_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instruction_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
        ]
      }
      note: {
        Row: {
          created_at: string
          date: string | null
          display_order: number
          food_entry_id: string | null
          id: string
          is_checkbox: boolean
          is_checked: boolean
          meal_type: Database["public"]["Enums"]["meal_type_enum"] | null
          note_type: Database["public"]["Enums"]["note_type"]
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          display_order?: number
          food_entry_id?: string | null
          id?: string
          is_checkbox?: boolean
          is_checked?: boolean
          meal_type?: Database["public"]["Enums"]["meal_type_enum"] | null
          note_type: Database["public"]["Enums"]["note_type"]
          user_id: string
          value: string
        }
        Update: {
          created_at?: string
          date?: string | null
          display_order?: number
          food_entry_id?: string | null
          id?: string
          is_checkbox?: boolean
          is_checked?: boolean
          meal_type?: Database["public"]["Enums"]["meal_type_enum"] | null
          note_type?: Database["public"]["Enums"]["note_type"]
          user_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_food_entry_id_fkey"
            columns: ["food_entry_id"]
            isOneToOne: false
            referencedRelation: "food_entry"
            referencedColumns: ["id"]
          },
        ]
      }
      profile: {
        Row: {
          activity_level:
            | Database["public"]["Enums"]["activity_level_enum"]
            | null
          avatar_id: string | null
          birthday: string | null
          calorie_target_type:
            | Database["public"]["Enums"]["calorie_target_type_enum"]
            | null
          carbs_grams: number | null
          created_at: string
          daily_calorie_goal: number | null
          disliked_food: string[] | null
          fat_grams: number | null
          gender: Database["public"]["Enums"]["gender_enum"] | null
          goal_lbs_per_week: number | null
          height_in: number | null
          id: string
          is_primary: boolean
          liked_food: string[] | null
          name: string
          protein_grams: number | null
          updated_at: string
          user_id: string
          weight_lb: number | null
        }
        Insert: {
          activity_level?:
            | Database["public"]["Enums"]["activity_level_enum"]
            | null
          avatar_id?: string | null
          birthday?: string | null
          calorie_target_type?:
            | Database["public"]["Enums"]["calorie_target_type_enum"]
            | null
          carbs_grams?: number | null
          created_at?: string
          daily_calorie_goal?: number | null
          disliked_food?: string[] | null
          fat_grams?: number | null
          gender?: Database["public"]["Enums"]["gender_enum"] | null
          goal_lbs_per_week?: number | null
          height_in?: number | null
          id?: string
          is_primary?: boolean
          liked_food?: string[] | null
          name: string
          protein_grams?: number | null
          updated_at?: string
          user_id: string
          weight_lb?: number | null
        }
        Update: {
          activity_level?:
            | Database["public"]["Enums"]["activity_level_enum"]
            | null
          avatar_id?: string | null
          birthday?: string | null
          calorie_target_type?:
            | Database["public"]["Enums"]["calorie_target_type_enum"]
            | null
          carbs_grams?: number | null
          created_at?: string
          daily_calorie_goal?: number | null
          disliked_food?: string[] | null
          fat_grams?: number | null
          gender?: Database["public"]["Enums"]["gender_enum"] | null
          goal_lbs_per_week?: number | null
          height_in?: number | null
          id?: string
          is_primary?: boolean
          liked_food?: string[] | null
          name?: string
          protein_grams?: number | null
          updated_at?: string
          user_id?: string
          weight_lb?: number | null
        }
        Relationships: []
      }
      profile_food_entry: {
        Row: {
          created_at: string
          food_entry_id: string
          id: string
          number_of_servings: number
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          food_entry_id: string
          id?: string
          number_of_servings: number
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          food_entry_id?: string
          id?: string
          number_of_servings?: number
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_food_entry_food_entry_id_fkey"
            columns: ["food_entry_id"]
            isOneToOne: false
            referencedRelation: "food_entry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_food_entry_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe: {
        Row: {
          cook_time_hours: number | null
          cook_time_minutes: number | null
          created_at: string
          description: string | null
          id: string
          image_id: string | null
          name: string
          number_of_servings: number
          prep_time_hours: number | null
          prep_time_minutes: number | null
          user_id: string
          visibility: Database["public"]["Enums"]["recipe_visibility"]
        }
        Insert: {
          cook_time_hours?: number | null
          cook_time_minutes?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_id?: string | null
          name: string
          number_of_servings: number
          prep_time_hours?: number | null
          prep_time_minutes?: number | null
          user_id: string
          visibility?: Database["public"]["Enums"]["recipe_visibility"]
        }
        Update: {
          cook_time_hours?: number | null
          cook_time_minutes?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_id?: string | null
          name?: string
          number_of_servings?: number
          prep_time_hours?: number | null
          prep_time_minutes?: number | null
          user_id?: string
          visibility?: Database["public"]["Enums"]["recipe_visibility"]
        }
        Relationships: []
      }
      serving: {
        Row: {
          calcium: number | null
          calories: number
          carbohydrate: number
          cholesterol: number | null
          created_at: string
          fat: number
          fat_secret_id: number | null
          fiber: number | null
          food_id: string
          id: string
          iron: number | null
          is_default: number | null
          measurement_description: string
          metric_serving_amount: number | null
          metric_serving_unit: string | null
          monounsaturated_fat: number | null
          number_of_units: number
          polyunsaturated_fat: number | null
          potassium: number | null
          protein: number
          saturated_fat: number | null
          serving_description: string
          sodium: number | null
          sugar: number | null
          trans_fat: number | null
          user_id: string | null
          vitamin_a: number | null
          vitamin_c: number | null
          vitamin_d: number | null
        }
        Insert: {
          calcium?: number | null
          calories: number
          carbohydrate: number
          cholesterol?: number | null
          created_at?: string
          fat: number
          fat_secret_id?: number | null
          fiber?: number | null
          food_id: string
          id?: string
          iron?: number | null
          is_default?: number | null
          measurement_description: string
          metric_serving_amount?: number | null
          metric_serving_unit?: string | null
          monounsaturated_fat?: number | null
          number_of_units: number
          polyunsaturated_fat?: number | null
          potassium?: number | null
          protein: number
          saturated_fat?: number | null
          serving_description: string
          sodium?: number | null
          sugar?: number | null
          trans_fat?: number | null
          user_id?: string | null
          vitamin_a?: number | null
          vitamin_c?: number | null
          vitamin_d?: number | null
        }
        Update: {
          calcium?: number | null
          calories?: number
          carbohydrate?: number
          cholesterol?: number | null
          created_at?: string
          fat?: number
          fat_secret_id?: number | null
          fiber?: number | null
          food_id?: string
          id?: string
          iron?: number | null
          is_default?: number | null
          measurement_description?: string
          metric_serving_amount?: number | null
          metric_serving_unit?: string | null
          monounsaturated_fat?: number | null
          number_of_units?: number
          polyunsaturated_fat?: number | null
          potassium?: number | null
          protein?: number
          saturated_fat?: number | null
          serving_description?: string
          sodium?: number | null
          sugar?: number | null
          trans_fat?: number | null
          user_id?: string | null
          vitamin_a?: number | null
          vitamin_c?: number | null
          vitamin_d?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "serving_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "food"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      shopping_list_item: {
        Row: {
          created_at: string
          food_id: string | null
          id: string
          is_checked: boolean
          meta: string | null
          name: string | null
          notes: string | null
          number_of_servings: number | null
          recipe_id: string | null
          serving_id: string | null
          shopping_list_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          food_id?: string | null
          id?: string
          is_checked?: boolean
          meta?: string | null
          name?: string | null
          notes?: string | null
          number_of_servings?: number | null
          recipe_id?: string | null
          serving_id?: string | null
          shopping_list_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          food_id?: string | null
          id?: string
          is_checked?: boolean
          meta?: string | null
          name?: string | null
          notes?: string | null
          number_of_servings?: number | null
          recipe_id?: string | null
          serving_id?: string | null
          shopping_list_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_item_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "food"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_item_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_item_serving_id_fkey"
            columns: ["serving_id"]
            isOneToOne: false
            referencedRelation: "serving"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_item_shopping_list_id_fkey"
            columns: ["shopping_list_id"]
            isOneToOne: false
            referencedRelation: "shopping_list"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      recipe_macros: {
        Row: {
          calcium: number | null
          calories: number | null
          carbohydrate: number | null
          cholesterol: number | null
          fat: number | null
          fiber: number | null
          iron: number | null
          monounsaturated_fat: number | null
          polyunsaturated_fat: number | null
          potassium: number | null
          protein: number | null
          recipe_id: string | null
          saturated_fat: number | null
          sugar: number | null
          trans_fat: number | null
          vitamin_a: number | null
          vitamin_c: number | null
          vitamin_d: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_recipe: {
        Args: {
          cook_time_hours?: number
          cook_time_minutes?: number
          description?: string
          image_id?: string
          ingredients: Json[]
          instructions?: Json[]
          name: string
          number_of_servings: number
          prep_time_hours?: number
          prep_time_minutes?: number
          recipe_id?: string
        }
        Returns: string
      }
      create_food_entry_with_profiles: {
        Args: {
          entry_date: string
          entry_food_id?: string
          entry_meal_type: Database["public"]["Enums"]["meal_type_enum"]
          entry_recipe_id?: string
          entry_serving_id?: string
          entry_type: Database["public"]["Enums"]["food_entry_type"]
          profile_servings?: Json
        }
        Returns: string
      }
      set_default_shopping_list: {
        Args: { shopping_list_id: string }
        Returns: undefined
      }
    }
    Enums: {
      activity_level_enum:
        | "sedentary"
        | "lightly_active"
        | "moderately_active"
        | "very_active"
        | "extremely_active"
      calorie_target_type_enum: "gain" | "maintain" | "lose"
      food_entry_type: "Recipe" | "Food"
      food_type: "Brand" | "Generic"
      gender_enum: "male" | "female" | "other"
      meal_type_enum: "Breakfast" | "Lunch" | "Dinner" | "Snack"
      note_type: "day_meal" | "food_entry"
      recipe_visibility: "owner" | "public"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          metadata: Json
          name: string
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          remote_table_id: string | null
          shard_id: string | null
          shard_key: string | null
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            isOneToOne: false
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search:
        | {
            Args: {
              bucketname: string
              levels?: number
              limits?: number
              offsets?: number
              prefix: string
            }
            Returns: {
              created_at: string
              id: string
              last_accessed_at: string
              metadata: Json
              name: string
              updated_at: string
            }[]
          }
        | {
            Args: {
              bucketname: string
              levels?: number
              limits?: number
              offsets?: number
              prefix: string
              search?: string
              sortcolumn?: string
              sortorder?: string
            }
            Returns: {
              created_at: string
              id: string
              last_accessed_at: string
              metadata: Json
              name: string
              updated_at: string
            }[]
          }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_level_enum: [
        "sedentary",
        "lightly_active",
        "moderately_active",
        "very_active",
        "extremely_active",
      ],
      calorie_target_type_enum: ["gain", "maintain", "lose"],
      food_entry_type: ["Recipe", "Food"],
      food_type: ["Brand", "Generic"],
      gender_enum: ["male", "female", "other"],
      meal_type_enum: ["Breakfast", "Lunch", "Dinner", "Snack"],
      note_type: ["day_meal", "food_entry"],
      recipe_visibility: ["owner", "public"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const

