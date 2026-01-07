export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          balance: number | null
          created_at: string
          household_id: string
          id: string
          name: string
          owner_id: string
          owner_type: Database["public"]["Enums"]["account_owner_type"]
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
          visibility: Database["public"]["Enums"]["account_visibility"]
        }
        Insert: {
          balance?: number | null
          created_at?: string
          household_id: string
          id?: string
          name: string
          owner_id: string
          owner_type?: Database["public"]["Enums"]["account_owner_type"]
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["account_visibility"]
        }
        Update: {
          balance?: number | null
          created_at?: string
          household_id?: string
          id?: string
          name?: string
          owner_id?: string
          owner_type?: Database["public"]["Enums"]["account_owner_type"]
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["account_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "accounts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_activity_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      allocations: {
        Row: {
          created_at: string
          id: string
          member_id: string
          memo: string | null
          share_type: Database["public"]["Enums"]["allocation_share_type"]
          share_value: number
          transaction_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          memo?: string | null
          share_type?: Database["public"]["Enums"]["allocation_share_type"]
          share_value: number
          transaction_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          memo?: string | null
          share_type?: Database["public"]["Enums"]["allocation_share_type"]
          share_value?: number
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "allocations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allocations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "household_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      budget_transfers: {
        Row: {
          amount: number
          bank_row_key: string | null
          created_at: string | null
          description: string | null
          from_user_id: string
          id: string
          month: string
          to_user_id: string
          transfer_date: string | null
        }
        Insert: {
          amount: number
          bank_row_key?: string | null
          created_at?: string | null
          description?: string | null
          from_user_id: string
          id?: string
          month: string
          to_user_id: string
          transfer_date?: string | null
        }
        Update: {
          amount?: number
          bank_row_key?: string | null
          created_at?: string | null
          description?: string | null
          from_user_id?: string
          id?: string
          month?: string
          to_user_id?: string
          transfer_date?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          event_date: string
          event_time: string | null
          event_type: string
          id: string
          is_completed: boolean | null
          is_recurring: boolean | null
          recurrence_interval: string | null
          reminder_days_before: number | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          event_date: string
          event_time?: string | null
          event_type?: string
          id?: string
          is_completed?: boolean | null
          is_recurring?: boolean | null
          recurrence_interval?: string | null
          reminder_days_before?: number | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          event_date?: string
          event_time?: string | null
          event_type?: string
          id?: string
          is_completed?: boolean | null
          is_recurring?: boolean | null
          recurrence_interval?: string | null
          reminder_days_before?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      expected_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          description: string
          expected_date: string
          id: string
          is_completed: boolean | null
          notes: string | null
          recurrence_months: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string | null
          description: string
          expected_date: string
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          recurrence_months?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          description?: string
          expected_date?: string
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          recurrence_months?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          attachment_url: string | null
          bill_period_end: string | null
          bill_period_start: string | null
          bill_provider: string | null
          bill_type: string | null
          booked_date: string | null
          category: string
          category_child: string | null
          category_parent: string | null
          consumption_unit: string | null
          consumption_value: number | null
          created_at: string
          date: string
          description: string
          due_month: string | null
          expense_type: Database["public"]["Enums"]["expense_type"] | null
          id: string
          is_family_expense: boolean | null
          is_paid: boolean | null
          linked_transfer_id: string | null
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          project_id: string | null
          purchase_date: string | null
          recurring: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          attachment_url?: string | null
          bill_period_end?: string | null
          bill_period_start?: string | null
          bill_provider?: string | null
          bill_type?: string | null
          booked_date?: string | null
          category?: string
          category_child?: string | null
          category_parent?: string | null
          consumption_unit?: string | null
          consumption_value?: number | null
          created_at?: string
          date: string
          description: string
          due_month?: string | null
          expense_type?: Database["public"]["Enums"]["expense_type"] | null
          id?: string
          is_family_expense?: boolean | null
          is_paid?: boolean | null
          linked_transfer_id?: string | null
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          project_id?: string | null
          purchase_date?: string | null
          recurring?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          bill_period_end?: string | null
          bill_period_start?: string | null
          bill_provider?: string | null
          bill_type?: string | null
          booked_date?: string | null
          category?: string
          category_child?: string | null
          category_parent?: string | null
          consumption_unit?: string | null
          consumption_value?: number | null
          created_at?: string
          date?: string
          description?: string
          due_month?: string | null
          expense_type?: Database["public"]["Enums"]["expense_type"] | null
          id?: string
          is_family_expense?: boolean | null
          is_paid?: boolean | null
          linked_transfer_id?: string | null
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          project_id?: string | null
          purchase_date?: string | null
          recurring?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_linked_transfer_id_fkey"
            columns: ["linked_transfer_id"]
            isOneToOne: false
            referencedRelation: "budget_transfers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string
          display_name: string
          household_id: string
          id: string
          joined_at: string
          left_at: string | null
          permissions: Json
          role: Database["public"]["Enums"]["household_member_role"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          household_id: string
          id?: string
          joined_at?: string
          left_at?: string | null
          permissions?: Json
          role?: Database["public"]["Enums"]["household_member_role"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          household_id?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          permissions?: Json
          role?: Database["public"]["Enums"]["household_member_role"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_transactions: {
        Row: {
          account_id: string | null
          amount: number
          attachment_url: string | null
          category_child: string | null
          category_parent: string | null
          created_at: string
          created_by_member_id: string | null
          date: string
          description: string
          household_id: string
          id: string
          legacy_expense_id: string | null
          legacy_transfer_id: string | null
          merchant: string | null
          notes: string | null
          related_transfer_id: string | null
          scope: Database["public"]["Enums"]["transaction_scope"]
          scope_owner_id: string
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          attachment_url?: string | null
          category_child?: string | null
          category_parent?: string | null
          created_at?: string
          created_by_member_id?: string | null
          date?: string
          description: string
          household_id: string
          id?: string
          legacy_expense_id?: string | null
          legacy_transfer_id?: string | null
          merchant?: string | null
          notes?: string | null
          related_transfer_id?: string | null
          scope?: Database["public"]["Enums"]["transaction_scope"]
          scope_owner_id: string
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          attachment_url?: string | null
          category_child?: string | null
          category_parent?: string | null
          created_at?: string
          created_by_member_id?: string | null
          date?: string
          description?: string
          household_id?: string
          id?: string
          legacy_expense_id?: string | null
          legacy_transfer_id?: string | null
          merchant?: string | null
          notes?: string | null
          related_transfer_id?: string | null
          scope?: Database["public"]["Enums"]["transaction_scope"]
          scope_owner_id?: string
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_transactions_created_by_member_id_fkey"
            columns: ["created_by_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_transactions_related_transfer_id_fkey"
            columns: ["related_transfer_id"]
            isOneToOne: false
            referencedRelation: "household_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          id: string
          name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          name: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      income_sources: {
        Row: {
          amount: number
          created_at: string
          end_date: string | null
          frequency: Database["public"]["Enums"]["income_frequency"]
          id: string
          is_active: boolean
          member_id: string
          name: string
          start_date: string
          type: Database["public"]["Enums"]["income_source_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["income_frequency"]
          id?: string
          is_active?: boolean
          member_id: string
          name: string
          start_date?: string
          type?: Database["public"]["Enums"]["income_source_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["income_frequency"]
          id?: string
          is_active?: boolean
          member_id?: string
          name?: string
          start_date?: string
          type?: Database["public"]["Enums"]["income_source_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_sources_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_settings: {
        Row: {
          company_address: string | null
          company_bank_address: string | null
          company_bic: string | null
          company_country: string | null
          company_email: string | null
          company_iban: string | null
          company_name: string | null
          company_vat: string | null
          created_at: string | null
          default_payment_days: number | null
          default_unit_price: number | null
          id: string
          project_location_label: string | null
          project_name_label: string | null
          show_client_vat: boolean | null
          show_project_location: boolean | null
          show_work_dates: boolean | null
          updated_at: string | null
          user_id: string
          work_end_label: string | null
          work_start_label: string | null
        }
        Insert: {
          company_address?: string | null
          company_bank_address?: string | null
          company_bic?: string | null
          company_country?: string | null
          company_email?: string | null
          company_iban?: string | null
          company_name?: string | null
          company_vat?: string | null
          created_at?: string | null
          default_payment_days?: number | null
          default_unit_price?: number | null
          id?: string
          project_location_label?: string | null
          project_name_label?: string | null
          show_client_vat?: boolean | null
          show_project_location?: boolean | null
          show_work_dates?: boolean | null
          updated_at?: string | null
          user_id: string
          work_end_label?: string | null
          work_start_label?: string | null
        }
        Update: {
          company_address?: string | null
          company_bank_address?: string | null
          company_bic?: string | null
          company_country?: string | null
          company_email?: string | null
          company_iban?: string | null
          company_name?: string | null
          company_vat?: string | null
          created_at?: string | null
          default_payment_days?: number | null
          default_unit_price?: number | null
          id?: string
          project_location_label?: string | null
          project_name_label?: string | null
          show_client_vat?: boolean | null
          show_project_location?: boolean | null
          show_work_dates?: boolean | null
          updated_at?: string | null
          user_id?: string
          work_end_label?: string | null
          work_start_label?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          client_address: string | null
          client_name: string
          client_vat: string | null
          created_at: string
          due_date: string
          exclude_from_budget: boolean
          id: string
          invoice_date: string
          invoice_number: string
          items: Json
          paid_amount: number
          paid_date: string | null
          payment_screenshot_url: string | null
          payment_terms: string | null
          payment_verified: boolean | null
          pdf_url: string | null
          project_id: string | null
          project_location: string | null
          project_name: string
          remaining_amount: number
          status: string
          total_amount: number
          updated_at: string
          user_id: string | null
          verification_method: string | null
          work_end_date: string | null
          work_start_date: string | null
        }
        Insert: {
          client_address?: string | null
          client_name: string
          client_vat?: string | null
          created_at?: string
          due_date: string
          exclude_from_budget?: boolean
          id?: string
          invoice_date: string
          invoice_number: string
          items?: Json
          paid_amount?: number
          paid_date?: string | null
          payment_screenshot_url?: string | null
          payment_terms?: string | null
          payment_verified?: boolean | null
          pdf_url?: string | null
          project_id?: string | null
          project_location?: string | null
          project_name: string
          remaining_amount?: number
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string | null
          verification_method?: string | null
          work_end_date?: string | null
          work_start_date?: string | null
        }
        Update: {
          client_address?: string | null
          client_name?: string
          client_vat?: string | null
          created_at?: string
          due_date?: string
          exclude_from_budget?: boolean
          id?: string
          invoice_date?: string
          invoice_number?: string
          items?: Json
          paid_amount?: number
          paid_date?: string | null
          payment_screenshot_url?: string | null
          payment_terms?: string | null
          payment_verified?: boolean | null
          pdf_url?: string | null
          project_id?: string | null
          project_location?: string | null
          project_name?: string
          remaining_amount?: number
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string | null
          verification_method?: string | null
          work_end_date?: string | null
          work_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      learned_categories: {
        Row: {
          category_child: string | null
          category_parent: string
          created_at: string | null
          description: string
          id: string
          updated_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          category_child?: string | null
          category_parent: string
          created_at?: string | null
          description: string
          id?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          category_child?: string | null
          category_parent?: string
          created_at?: string | null
          description?: string
          id?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      project_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          project_id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          project_id: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          project_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_reports: {
        Row: {
          chat_history: Json
          content: string
          created_at: string
          id: string
          project_id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_history?: Json
          content?: string
          created_at?: string
          id?: string
          project_id: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_history?: Json
          content?: string
          created_at?: string
          id?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          billing_period: string
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          billing_period?: string
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          billing_period?: string
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      support_relationships: {
        Row: {
          created_at: string
          end_date: string | null
          household_id: string
          id: string
          privacy_mode: Database["public"]["Enums"]["privacy_mode"]
          recipient_member_id: string
          scope_of_visibility: Database["public"]["Enums"]["visibility_scope"]
          start_date: string
          supporter_member_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          household_id: string
          id?: string
          privacy_mode?: Database["public"]["Enums"]["privacy_mode"]
          recipient_member_id: string
          scope_of_visibility?: Database["public"]["Enums"]["visibility_scope"]
          start_date?: string
          supporter_member_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          household_id?: string
          id?: string
          privacy_mode?: Database["public"]["Enums"]["privacy_mode"]
          recipient_member_id?: string
          scope_of_visibility?: Database["public"]["Enums"]["visibility_scope"]
          start_date?: string
          supporter_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_relationships_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_relationships_recipient_member_id_fkey"
            columns: ["recipient_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_relationships_supporter_member_id_fkey"
            columns: ["supporter_member_id"]
            isOneToOne: false
            referencedRelation: "household_members"
            referencedColumns: ["id"]
          },
        ]
      }
      user_clients: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          is_favorite: boolean | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string | null
          user_id: string
          vat: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_favorite?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id: string
          vat?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_favorite?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string
          vat?: string | null
        }
        Relationships: []
      }
      user_financial_settings: {
        Row: {
          created_at: string | null
          daily_rate: number | null
          estimated_bills_costs: number | null
          estimated_fixed_costs: number | null
          estimated_variable_costs: number | null
          fourteenth_month: number | null
          gross_salary: number | null
          has_fourteenth: boolean | null
          has_thirteenth: boolean | null
          id: string
          initial_balance: number | null
          initial_balance_date: string | null
          monthly_salary: number | null
          overtime_rate: number | null
          payment_delay_days: number | null
          pension_monthly_amount: number | null
          pension_start_date: string | null
          pension_target_amount: number | null
          pension_target_years: number | null
          permits_used: number | null
          production_bonus_amount: number | null
          production_bonus_month: number | null
          sales_bonus_amount: number | null
          sales_bonus_months: number[] | null
          sick_days_used: number | null
          sp500_return_rate: number | null
          tax_bracket: string | null
          thirteenth_month: number | null
          updated_at: string | null
          use_custom_initial_balance: boolean | null
          use_manual_estimates: boolean | null
          user_id: string
          vacation_days_total: number | null
          vacation_days_used: number | null
        }
        Insert: {
          created_at?: string | null
          daily_rate?: number | null
          estimated_bills_costs?: number | null
          estimated_fixed_costs?: number | null
          estimated_variable_costs?: number | null
          fourteenth_month?: number | null
          gross_salary?: number | null
          has_fourteenth?: boolean | null
          has_thirteenth?: boolean | null
          id?: string
          initial_balance?: number | null
          initial_balance_date?: string | null
          monthly_salary?: number | null
          overtime_rate?: number | null
          payment_delay_days?: number | null
          pension_monthly_amount?: number | null
          pension_start_date?: string | null
          pension_target_amount?: number | null
          pension_target_years?: number | null
          permits_used?: number | null
          production_bonus_amount?: number | null
          production_bonus_month?: number | null
          sales_bonus_amount?: number | null
          sales_bonus_months?: number[] | null
          sick_days_used?: number | null
          sp500_return_rate?: number | null
          tax_bracket?: string | null
          thirteenth_month?: number | null
          updated_at?: string | null
          use_custom_initial_balance?: boolean | null
          use_manual_estimates?: boolean | null
          user_id: string
          vacation_days_total?: number | null
          vacation_days_used?: number | null
        }
        Update: {
          created_at?: string | null
          daily_rate?: number | null
          estimated_bills_costs?: number | null
          estimated_fixed_costs?: number | null
          estimated_variable_costs?: number | null
          fourteenth_month?: number | null
          gross_salary?: number | null
          has_fourteenth?: boolean | null
          has_thirteenth?: boolean | null
          id?: string
          initial_balance?: number | null
          initial_balance_date?: string | null
          monthly_salary?: number | null
          overtime_rate?: number | null
          payment_delay_days?: number | null
          pension_monthly_amount?: number | null
          pension_start_date?: string | null
          pension_target_amount?: number | null
          pension_target_years?: number | null
          permits_used?: number | null
          production_bonus_amount?: number | null
          production_bonus_month?: number | null
          sales_bonus_amount?: number | null
          sales_bonus_months?: number[] | null
          sick_days_used?: number | null
          sp500_return_rate?: number | null
          tax_bracket?: string | null
          thirteenth_month?: number | null
          updated_at?: string | null
          use_custom_initial_balance?: boolean | null
          use_manual_estimates?: boolean | null
          user_id?: string
          vacation_days_total?: number | null
          vacation_days_used?: number | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          age: number | null
          app_mode: string | null
          car_count: number | null
          city_size: string | null
          created_at: string | null
          display_name: string
          family_members_count: number | null
          family_structure: string | null
          gender: string | null
          has_car: boolean | null
          heating_type: string | null
          household_id: string | null
          housing_sqm: number | null
          housing_type: string | null
          id: string
          income_type: string | null
          invite_code: string | null
          linked_to_user_id: string | null
          region: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string
          variable_months_lookback: number | null
          years_worked: number | null
        }
        Insert: {
          age?: number | null
          app_mode?: string | null
          car_count?: number | null
          city_size?: string | null
          created_at?: string | null
          display_name: string
          family_members_count?: number | null
          family_structure?: string | null
          gender?: string | null
          has_car?: boolean | null
          heating_type?: string | null
          household_id?: string | null
          housing_sqm?: number | null
          housing_type?: string | null
          id?: string
          income_type?: string | null
          invite_code?: string | null
          linked_to_user_id?: string | null
          region?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id: string
          variable_months_lookback?: number | null
          years_worked?: number | null
        }
        Update: {
          age?: number | null
          app_mode?: string | null
          car_count?: number | null
          city_size?: string | null
          created_at?: string | null
          display_name?: string
          family_members_count?: number | null
          family_structure?: string | null
          gender?: string | null
          has_car?: boolean | null
          heating_type?: string | null
          household_id?: string | null
          housing_sqm?: number | null
          housing_type?: string | null
          id?: string
          income_type?: string | null
          invite_code?: string | null
          linked_to_user_id?: string | null
          region?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string
          variable_months_lookback?: number | null
          years_worked?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string | null
          status: string
          trial_end: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          trial_end?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: string
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_profile_by_invite_code: {
        Args: { _invite_code: string }
        Returns: {
          display_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_linked_profile: {
        Args: { _primary_user_id: string; _user_id: string }
        Returns: boolean
      }
      user_household_ids: { Args: { _user_id: string }; Returns: string[] }
    }
    Enums: {
      account_owner_type: "member" | "household"
      account_type: "bank" | "cash" | "card" | "wallet" | "virtual"
      account_visibility: "personal" | "shared"
      allocation_share_type: "amount" | "percent"
      app_role: "admin" | "super_admin" | "user"
      expense_type: "privata" | "aziendale"
      household_member_role: "owner" | "admin" | "member" | "viewer"
      income_frequency: "monthly" | "biweekly" | "weekly" | "one_time"
      income_source_type:
        | "salary"
        | "pension"
        | "freelance"
        | "support"
        | "other"
      payment_method: "contanti" | "bancomat" | "carta_credito" | "bonifico"
      privacy_mode: "detailed" | "summary"
      transaction_scope: "member" | "household"
      transaction_status: "actual" | "planned"
      transaction_type: "expense" | "income" | "transfer"
      user_role: "primary" | "secondary"
      visibility_scope: "all_recipient_spend" | "only_supported_funds"
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
  public: {
    Enums: {
      account_owner_type: ["member", "household"],
      account_type: ["bank", "cash", "card", "wallet", "virtual"],
      account_visibility: ["personal", "shared"],
      allocation_share_type: ["amount", "percent"],
      app_role: ["admin", "super_admin", "user"],
      expense_type: ["privata", "aziendale"],
      household_member_role: ["owner", "admin", "member", "viewer"],
      income_frequency: ["monthly", "biweekly", "weekly", "one_time"],
      income_source_type: [
        "salary",
        "pension",
        "freelance",
        "support",
        "other",
      ],
      payment_method: ["contanti", "bancomat", "carta_credito", "bonifico"],
      privacy_mode: ["detailed", "summary"],
      transaction_scope: ["member", "household"],
      transaction_status: ["actual", "planned"],
      transaction_type: ["expense", "income", "transfer"],
      user_role: ["primary", "secondary"],
      visibility_scope: ["all_recipient_spend", "only_supported_funds"],
    },
  },
} as const
