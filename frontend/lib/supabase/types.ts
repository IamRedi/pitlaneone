export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          is_active: boolean;
          role: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          is_active?: boolean;
          role?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          is_active?: boolean;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          created_at: string;
          ui_locale: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          ui_locale?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          ui_locale?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      client_intake_notes: {
        Row: {
          client_id: string;
          company_id: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          note: string;
          owner_id: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          client_id: string;
          company_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          note: string;
          owner_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          company_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          note?: string;
          owner_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "client_intake_notes_client_company_id_fkey";
            columns: ["client_id", "company_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id", "company_id"];
          },
          {
            foreignKeyName: "client_intake_notes_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_intake_notes_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_intake_notes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "admins";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_intake_notes_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "admins";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          auth_user_id: string | null;
          billing_address: string | null;
          billing_city: string | null;
          billing_country: string | null;
          billing_country_code: string;
          billing_email: string | null;
          billing_name: string | null;
          billing_postal_code: string | null;
          buyer_reference: string | null;
          company_id: string | null;
          created_at: string;
          customer_type: string;
          electronic_address: string | null;
          electronic_address_scheme: string;
          first_name: string;
          id: string;
          is_vip: boolean;
          last_name: string;
          owner_id: string | null;
          phone: string;
          pin_hash: string;
          updated_at: string;
          vat_id: string | null;
        };
        Insert: {
          auth_user_id?: string | null;
          billing_address?: string | null;
          billing_city?: string | null;
          billing_country?: string | null;
          billing_country_code?: string;
          billing_email?: string | null;
          billing_name?: string | null;
          billing_postal_code?: string | null;
          buyer_reference?: string | null;
          company_id?: string | null;
          created_at?: string;
          customer_type?: string;
          electronic_address?: string | null;
          electronic_address_scheme?: string;
          first_name: string;
          id?: string;
          is_vip?: boolean;
          last_name: string;
          owner_id?: string | null;
          phone: string;
          pin_hash?: string;
          updated_at?: string;
          vat_id?: string | null;
        };
        Update: {
          auth_user_id?: string | null;
          billing_address?: string | null;
          billing_city?: string | null;
          billing_country?: string | null;
          billing_country_code?: string;
          billing_email?: string | null;
          billing_name?: string | null;
          billing_postal_code?: string | null;
          buyer_reference?: string | null;
          company_id?: string | null;
          created_at?: string;
          customer_type?: string;
          electronic_address?: string | null;
          electronic_address_scheme?: string;
          first_name?: string;
          id?: string;
          is_vip?: boolean;
          last_name?: string;
          owner_id?: string | null;
          phone?: string;
          pin_hash?: string;
          updated_at?: string;
          vat_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clients_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "admins";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          business_site_generation_source: string | null;
          business_site_generation_version: number | null;
          business_site_intake: Json;
          created_at: string;
          created_by: string;
          demo_expires_at: string | null;
          id: string;
          industry_key: string;
          industry_subcategory_key: string;
          lifecycle_status: string;
          name: string;
          product_surface: string;
          slug: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          business_site_generation_source?: string | null;
          business_site_generation_version?: number | null;
          business_site_intake?: Json;
          created_at?: string;
          created_by: string;
          demo_expires_at?: string | null;
          id?: string;
          industry_key?: string;
          industry_subcategory_key?: string;
          lifecycle_status?: string;
          name: string;
          product_surface?: string;
          slug: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          business_site_generation_source?: string | null;
          business_site_generation_version?: number | null;
          business_site_intake?: Json;
          created_at?: string;
          created_by?: string;
          demo_expires_at?: string | null;
          id?: string;
          industry_key?: string;
          industry_subcategory_key?: string;
          lifecycle_status?: string;
          name?: string;
          product_surface?: string;
          slug?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      company_modules: {
        Row: {
          catalog_item_id: string | null;
          company_id: string;
          enabled_at: string;
          enabled_by: string;
          module_key: string;
        };
        Insert: {
          company_id: string;
          enabled_at?: string;
          enabled_by?: string;
          module_key: string;
        };
        Update: {
          company_id?: string;
          enabled_at?: string;
          enabled_by?: string;
          module_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_modules_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_domains: {
        Row: {
          company_id: string;
          created_at: string;
          domain_type: string;
          hostname: string;
          id: string;
          is_primary: boolean;
          is_verified: boolean;
          updated_at: string;
          verification_token: string;
          verified_at: string | null;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          domain_type?: string;
          hostname: string;
          id?: string;
          is_primary?: boolean;
          is_verified?: boolean;
          updated_at?: string;
          verification_token?: string;
          verified_at?: string | null;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          domain_type?: string;
          hostname?: string;
          id?: string;
          is_primary?: boolean;
          is_verified?: boolean;
          updated_at?: string;
          verification_token?: string;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "company_domains_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_invoice_sequences: {
        Row: {
          company_id: string;
          next_number: number;
        };
        Insert: {
          company_id: string;
          next_number?: number;
        };
        Update: {
          company_id?: string;
          next_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "company_invoice_sequences_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: true;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_invoice_settings: {
        Row: {
          bank_iban: string | null;
          bank_name: string | null;
          company_id: string;
          created_at: string;
          all_per_eur_rate: number;
          default_currency: string;
          default_tax_rate: number;
          contact_email: string | null;
          invoice_footer: string | null;
          legal_name: string | null;
          registration_country: string;
          registration_number: string | null;
          payment_terms: string;
          seller_city: string | null;
          seller_country_code: string;
          seller_postal_code: string | null;
          seller_street: string | null;
          tax_id: string | null;
          tax_rate_configured: boolean;
          updated_at: string;
          vat_exemption_reason: string | null;
        };
        Insert: {
          bank_iban?: string | null;
          bank_name?: string | null;
          company_id: string;
          created_at?: string;
          all_per_eur_rate?: number;
          default_currency?: string;
          default_tax_rate?: number;
          contact_email?: string | null;
          invoice_footer?: string | null;
          legal_name?: string | null;
          registration_country?: string;
          registration_number?: string | null;
          payment_terms?: string;
          seller_city?: string | null;
          seller_country_code?: string;
          seller_postal_code?: string | null;
          seller_street?: string | null;
          tax_id?: string | null;
          tax_rate_configured?: boolean;
          updated_at?: string;
          vat_exemption_reason?: string | null;
        };
        Update: {
          bank_iban?: string | null;
          bank_name?: string | null;
          company_id?: string;
          created_at?: string;
          all_per_eur_rate?: number;
          default_currency?: string;
          default_tax_rate?: number;
          contact_email?: string | null;
          invoice_footer?: string | null;
          legal_name?: string | null;
          registration_country?: string;
          registration_number?: string | null;
          payment_terms?: string;
          seller_city?: string | null;
          seller_country_code?: string;
          seller_postal_code?: string | null;
          seller_street?: string | null;
          tax_id?: string | null;
          tax_rate_configured?: boolean;
          updated_at?: string;
          vat_exemption_reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "company_invoice_settings_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: true;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_profiles: {
        Row: {
          address: string | null;
          about_body: string;
          about_title: string;
          city: string | null;
          company_id: string;
          country: string | null;
          contact_body: string;
          contact_title: string;
          created_at: string;
          description: string | null;
          display_name: string;
          email: string | null;
          gallery_subtitle: string;
          gallery_title: string;
          hero_eyebrow: string;
          hero_subtitle: string;
          hero_title: string;
          instagram_url: string | null;
          facebook_url: string | null;
          is_public: boolean;
          phone: string | null;
          service_one_description: string;
          service_one_title: string;
          service_three_description: string;
          service_three_title: string;
          service_two_description: string;
          service_two_title: string;
          tiktok_url: string | null;
          updated_at: string;
          whatsapp: string | null;
          website_locale: string;
          working_hours: Json;
        };
        Insert: {
          address?: string | null;
          about_body?: string;
          about_title?: string;
          city?: string | null;
          company_id: string;
          country?: string | null;
          contact_body?: string;
          contact_title?: string;
          created_at?: string;
          description?: string | null;
          display_name: string;
          email?: string | null;
          gallery_subtitle?: string;
          gallery_title?: string;
          hero_eyebrow?: string;
          hero_subtitle?: string;
          hero_title?: string;
          instagram_url?: string | null;
          facebook_url?: string | null;
          is_public?: boolean;
          phone?: string | null;
          service_one_description?: string;
          service_one_title?: string;
          service_three_description?: string;
          service_three_title?: string;
          service_two_description?: string;
          service_two_title?: string;
          tiktok_url?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
          website_locale?: string;
          working_hours?: Json;
        };
        Update: {
          address?: string | null;
          about_body?: string;
          about_title?: string;
          city?: string | null;
          company_id?: string;
          country?: string | null;
          contact_body?: string;
          contact_title?: string;
          created_at?: string;
          description?: string | null;
          display_name?: string;
          email?: string | null;
          gallery_subtitle?: string;
          gallery_title?: string;
          hero_eyebrow?: string;
          hero_subtitle?: string;
          hero_title?: string;
          instagram_url?: string | null;
          facebook_url?: string | null;
          is_public?: boolean;
          phone?: string | null;
          service_one_description?: string;
          service_one_title?: string;
          service_three_description?: string;
          service_three_title?: string;
          service_two_description?: string;
          service_two_title?: string;
          tiktok_url?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
          website_locale?: string;
          working_hours?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "company_profiles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: true;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_appointment_requests: {
        Row: {
          company_id: string;
          created_at: string;
          customer_responded_at: string | null;
          customer_response_expires_at: string | null;
          customer_response_token: string | null;
          customer_name: string;
          handled_at: string | null;
          handled_by: string | null;
          id: string;
          note: string | null;
          phone: string;
          preferred_date: string | null;
          preferred_time: string | null;
          scheduled_start: string | null;
          duration_minutes: number;
          service_currency: string | null;
          service_interest: string;
          service_price: number | null;
          status:
            | "requested"
            | "awaiting_customer"
            | "confirmed"
            | "declined"
            | "cancelled";
          vehicle_description: string | null;
          vehicle_plate: string | null;
        };
        Insert: {
          catalog_item_id?: string | null;
          company_id: string;
          created_at?: string;
          customer_responded_at?: string | null;
          customer_response_expires_at?: string | null;
          customer_response_token?: string | null;
          customer_name: string;
          handled_at?: string | null;
          handled_by?: string | null;
          id?: string;
          note?: string | null;
          phone: string;
          preferred_date?: string | null;
          preferred_time?: string | null;
          scheduled_start?: string | null;
          duration_minutes?: number;
          service_currency?: string | null;
          service_interest: string;
          service_price?: number | null;
          status?:
            | "requested"
            | "awaiting_customer"
            | "confirmed"
            | "declined"
            | "cancelled";
          vehicle_description?: string | null;
          vehicle_plate?: string | null;
        };
        Update: {
          catalog_item_id?: string | null;
          company_id?: string;
          created_at?: string;
          customer_responded_at?: string | null;
          customer_response_expires_at?: string | null;
          customer_response_token?: string | null;
          customer_name?: string;
          handled_at?: string | null;
          handled_by?: string | null;
          id?: string;
          note?: string | null;
          phone?: string;
          preferred_date?: string | null;
          preferred_time?: string | null;
          scheduled_start?: string | null;
          duration_minutes?: number;
          service_currency?: string | null;
          service_interest?: string;
          service_price?: number | null;
          status?:
            | "requested"
            | "awaiting_customer"
            | "confirmed"
            | "declined"
            | "cancelled";
          vehicle_description?: string | null;
          vehicle_plate?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "company_appointment_requests_catalog_item_id_fkey";
            columns: ["catalog_item_id"];
            isOneToOne: false;
            referencedRelation: "company_catalog_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_appointment_requests_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_appointment_work_tickets: {
        Row: {
          appointment_request_id: string;
          company_id: string;
          completed_at: string | null;
          created_at: string;
          customer_name: string;
          id: string;
          note: string | null;
          phone: string;
          scheduled_start: string;
          service_interest: string;
          status: "ready" | "completed" | "cancelled";
          vehicle_description: string | null;
          vehicle_plate: string | null;
        };
        Insert: {
          appointment_request_id: string;
          company_id: string;
          completed_at?: string | null;
          created_at?: string;
          customer_name: string;
          id?: string;
          note?: string | null;
          phone: string;
          scheduled_start: string;
          service_interest: string;
          status?: "ready" | "completed" | "cancelled";
          vehicle_description?: string | null;
          vehicle_plate?: string | null;
        };
        Update: {
          completed_at?: string | null;
          status?: "ready" | "completed" | "cancelled";
          vehicle_description?: string | null;
          vehicle_plate?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "company_appointment_work_tickets_appointment_request_id_fkey";
            columns: ["appointment_request_id"];
            isOneToOne: false;
            referencedRelation: "company_appointment_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_appointment_work_tickets_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_appointment_business_hours: {
        Row: {
          company_id: string;
          weekday: number;
          is_open: boolean;
          opens_at: string;
          closes_at: string;
          slot_minutes: number;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          weekday: number;
          is_open?: boolean;
          opens_at?: string;
          closes_at?: string;
          slot_minutes?: number;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          weekday?: number;
          is_open?: boolean;
          opens_at?: string;
          closes_at?: string;
          slot_minutes?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_appointment_business_hours_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_theme_settings: {
        Row: {
          accent_color: string;
          background_color: string;
          button_radius: string;
          company_id: string;
          created_at: string;
          font_style: string;
          gallery_one_image_url: string | null;
          gallery_three_image_url: string | null;
          gallery_two_image_url: string | null;
          hero_image_url: string | null;
          hero_mobile_image_url: string | null;
          logo_url: string | null;
          primary_color: string;
          service_one_image_url: string | null;
          service_three_image_url: string | null;
          service_two_image_url: string | null;
          surface_color: string;
          text_color: string;
          theme_preset: string;
          updated_at: string;
        };
        Insert: {
          accent_color?: string;
          background_color?: string;
          button_radius?: string;
          company_id: string;
          created_at?: string;
          font_style?: string;
          gallery_one_image_url?: string | null;
          gallery_three_image_url?: string | null;
          gallery_two_image_url?: string | null;
          hero_image_url?: string | null;
          hero_mobile_image_url?: string | null;
          logo_url?: string | null;
          primary_color?: string;
          service_one_image_url?: string | null;
          service_three_image_url?: string | null;
          service_two_image_url?: string | null;
          surface_color?: string;
          text_color?: string;
          theme_preset?: string;
          updated_at?: string;
        };
        Update: {
          accent_color?: string;
          background_color?: string;
          button_radius?: string;
          company_id?: string;
          created_at?: string;
          font_style?: string;
          gallery_one_image_url?: string | null;
          gallery_three_image_url?: string | null;
          gallery_two_image_url?: string | null;
          hero_image_url?: string | null;
          hero_mobile_image_url?: string | null;
          logo_url?: string | null;
          primary_color?: string;
          service_one_image_url?: string | null;
          service_three_image_url?: string | null;
          service_two_image_url?: string | null;
          surface_color?: string;
          text_color?: string;
          theme_preset?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_theme_settings_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: true;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_users: {
        Row: {
          company_id: string;
          created_at: string;
          is_active: boolean;
          member_email: string | null;
          role: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          is_active?: boolean;
          member_email?: string | null;
          role?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          is_active?: boolean;
          member_email?: string | null;
          role?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_users_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      company_invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          company_id: string;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          role: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          company_id: string;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by: string;
          role: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          company_id?: string;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          role?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_invitations_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      gallery_images: {
        Row: {
          company_id: string | null;
          created_at: string;
          id: string;
          image_url: string;
          owner_id: string | null;
          title: string | null;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string;
          id?: string;
          image_url: string;
          owner_id?: string | null;
          title?: string | null;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string;
          owner_id?: string | null;
          title?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "gallery_images_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gallery_images_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "admins";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          amount_paid: number;
          cancel_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          cancelled_by_invoice_id: string | null;
          client_id: string;
          company_id: string | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          due_date: string | null;
          exchange_rate: number;
          fee_total: number;
          finalized_at: string;
          id: string;
          invoice_kind: string;
          invoice_snapshot: Json;
          invoice_number: string | null;
          issued_at: string;
          labor_total: number;
          lifecycle_status: string;
          material_total: number;
          net_amount: number;
          owner_id: string | null;
          registration_country: string;
          related_invoice_id: string | null;
          service_id: string | null;
          status: Database["public"]["Enums"]["invoice_status"];
          tax_amount: number;
          tax_rate: number;
          total_amount: number;
          updated_at: string;
        };
        Insert: {
          amount_paid?: number;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancelled_by_invoice_id?: string | null;
          client_id: string;
          company_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          due_date?: string | null;
          exchange_rate?: number;
          fee_total?: number;
          finalized_at?: string;
          id?: string;
          invoice_kind?: string;
          invoice_snapshot: Json;
          invoice_number?: string | null;
          issued_at?: string;
          labor_total?: number;
          lifecycle_status?: string;
          material_total?: number;
          net_amount?: number;
          owner_id?: string | null;
          registration_country?: string;
          related_invoice_id?: string | null;
          service_id?: string | null;
          status?: Database["public"]["Enums"]["invoice_status"];
          tax_amount?: number;
          tax_rate?: number;
          total_amount?: number;
          updated_at?: string;
        };
        Update: {
          amount_paid?: number;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancelled_by_invoice_id?: string | null;
          client_id?: string;
          company_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          due_date?: string | null;
          exchange_rate?: number;
          fee_total?: number;
          finalized_at?: string;
          id?: string;
          invoice_kind?: string;
          invoice_snapshot?: Json;
          invoice_number?: string | null;
          issued_at?: string;
          labor_total?: number;
          lifecycle_status?: string;
          material_total?: number;
          net_amount?: number;
          owner_id?: string | null;
          registration_country?: string;
          related_invoice_id?: string | null;
          service_id?: string | null;
          status?: Database["public"]["Enums"]["invoice_status"];
          tax_amount?: number;
          tax_rate?: number;
          total_amount?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_client_company_id_fkey";
            columns: ["client_id", "company_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id", "company_id"];
          },
          {
            foreignKeyName: "invoices_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "admins";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_service_company_id_fkey";
            columns: ["service_id", "company_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id", "company_id"];
          },
          {
            foreignKeyName: "invoices_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_documents: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          document_format: string;
          document_standard: string | null;
          id: string;
          invoice_id: string;
          mime_type: string;
          original_filename: string;
          sha256: string;
          size_bytes: number;
          storage_path: string;
          standard_version: string | null;
          validation_report: Json;
          validation_status: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          document_format: string;
          document_standard?: string | null;
          id?: string;
          invoice_id: string;
          mime_type: string;
          original_filename: string;
          sha256: string;
          size_bytes: number;
          storage_path: string;
          standard_version?: string | null;
          validation_report?: Json;
          validation_status?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          document_format?: string;
          document_standard?: string | null;
          id?: string;
          invoice_id?: string;
          mime_type?: string;
          original_filename?: string;
          sha256?: string;
          size_bytes?: number;
          storage_path?: string;
          standard_version?: string | null;
          validation_report?: Json;
          validation_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_documents_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_documents_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_events: {
        Row: {
          actor_id: string | null;
          company_id: string;
          created_at: string;
          event_data: Json;
          event_type: string;
          id: number;
          invoice_id: string;
        };
        Insert: {
          actor_id?: string | null;
          company_id: string;
          created_at?: string;
          event_data?: Json;
          event_type: string;
          id?: never;
          invoice_id: string;
        };
        Update: {
          actor_id?: string | null;
          company_id?: string;
          created_at?: string;
          event_data?: Json;
          event_type?: string;
          id?: never;
          invoice_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_events_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_events_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      reminders: {
        Row: {
          company_id: string | null;
          id: string;
          next_date: string | null;
          next_km: number | null;
          notified: boolean;
          owner_id: string | null;
          type: string;
          updated_at: string;
          vehicle_id: string;
        };
        Insert: {
          company_id?: string | null;
          id?: string;
          next_date?: string | null;
          next_km?: number | null;
          notified?: boolean;
          owner_id?: string | null;
          type: string;
          updated_at?: string;
          vehicle_id: string;
        };
        Update: {
          company_id?: string | null;
          id?: string;
          next_date?: string | null;
          next_km?: number | null;
          notified?: boolean;
          owner_id?: string | null;
          type?: string;
          updated_at?: string;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reminders_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reminders_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "admins";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reminders_vehicle_company_id_fkey";
            columns: ["vehicle_id", "company_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id", "company_id"];
          },
          {
            foreignKeyName: "reminders_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      service_items: {
        Row: {
          company_id: string | null;
          fee: number;
          id: string;
          labor_cost: number;
          labor_discount_percent: number;
          material_cost: number;
          name: string;
          owner_id: string | null;
          quantity: number;
          service_id: string;
          unit_label: string | null;
          unit_price: number;
          updated_at: string;
        };
        Insert: {
          company_id?: string | null;
          fee?: number;
          id?: string;
          labor_cost?: number;
          labor_discount_percent?: number;
          material_cost?: number;
          name: string;
          owner_id?: string | null;
          quantity?: number;
          service_id: string;
          unit_label?: string | null;
          unit_price?: number;
          updated_at?: string;
        };
        Update: {
          company_id?: string | null;
          fee?: number;
          id?: string;
          labor_cost?: number;
          labor_discount_percent?: number;
          material_cost?: number;
          name?: string;
          owner_id?: string | null;
          quantity?: number;
          service_id?: string;
          unit_label?: string | null;
          unit_price?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_items_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_items_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "admins";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_items_service_company_id_fkey";
            columns: ["service_id", "company_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id", "company_id"];
          },
          {
            foreignKeyName: "service_items_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          company_id: string | null;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          date: string;
          id: string;
          km: number;
          notes: string | null;
          owner_id: string | null;
          total_amount: number;
          type: Database["public"]["Enums"]["service_type"];
          updated_at: string;
          vehicle_id: string;
          work_status: string;
        };
        Insert: {
          company_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          date: string;
          id?: string;
          km: number;
          notes?: string | null;
          owner_id?: string | null;
          total_amount?: number;
          type?: Database["public"]["Enums"]["service_type"];
          updated_at?: string;
          vehicle_id: string;
          work_status?: string;
        };
        Update: {
          company_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          date?: string;
          id?: string;
          km?: number;
          notes?: string | null;
          owner_id?: string | null;
          total_amount?: number;
          type?: Database["public"]["Enums"]["service_type"];
          updated_at?: string;
          vehicle_id?: string;
          work_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "services_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "services_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "admins";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "services_vehicle_company_id_fkey";
            columns: ["vehicle_id", "company_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id", "company_id"];
          },
          {
            foreignKeyName: "services_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicles: {
        Row: {
          client_id: string;
          company_id: string | null;
          created_at: string;
          current_km: number;
          id: string;
          model: string;
          owner_id: string | null;
          plate_number: string;
          updated_at: string;
          vin: string | null;
        };
        Insert: {
          client_id: string;
          company_id?: string | null;
          created_at?: string;
          current_km?: number;
          id?: string;
          model: string;
          owner_id?: string | null;
          plate_number: string;
          updated_at?: string;
          vin?: string | null;
        };
        Update: {
          client_id?: string;
          company_id?: string | null;
          created_at?: string;
          current_km?: number;
          id?: string;
          model?: string;
          owner_id?: string | null;
          plate_number?: string;
          updated_at?: string;
          vin?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vehicles_client_company_id_fkey";
            columns: ["client_id", "company_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id", "company_id"];
          },
          {
            foreignKeyName: "vehicles_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicles_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "admins";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_company_member_by_email: {
        Args: {
          input_company_id: string;
          input_email: string;
          input_role: string;
        };
        Returns: undefined;
      };
      accept_company_invitation: {
        Args: { input_invitation_id: string };
        Returns: string;
      };
      company_id_from_asset_path: {
        Args: { object_name: string };
        Returns: string;
      };
      cancel_company_invoice: {
        Args: {
          input_company_id: string;
          input_invoice_id: string;
          input_reason: string;
        };
        Returns: string;
      };
      cancel_company_invoice_with_refund: {
        Args: {
          input_company_id: string;
          input_invoice_id: string;
          input_reason: string;
          input_refund_confirmed?: boolean;
        };
        Returns: string;
      };
      create_company_invoice_from_service: {
        Args: {
          input_company_id: string;
          input_due_date?: string;
          input_service_id: string;
        };
        Returns: string;
      };
      create_company_open_work: {
        Args: {
          input_company_id: string;
          input_date: string;
          input_items: Json;
          input_km: number;
          input_notes: string;
          input_type: Database["public"]["Enums"]["service_type"];
          input_vehicle_id: string;
        };
        Returns: string;
      };
      register_company_invoice_document: {
        Args: {
          input_company_id: string;
          input_document_standard?: string | null;
          input_document_format: string;
          input_invoice_id: string;
          input_mime_type: string;
          input_original_filename: string;
          input_sha256: string;
          input_size_bytes: number;
          input_standard_version?: string | null;
          input_storage_path: string;
          input_validation_report?: Json;
          input_validation_status?: string;
        };
        Returns: string;
      };
      create_trial_company: {
        Args: {
          input_name: string;
          input_slug: string;
        };
        Returns: string;
      };
      create_platform_business_site_demo: {
        Args: {
          input_generation_payload: Json;
          input_generation_source: string;
          input_industry_key: string;
          input_name: string;
          input_slug: string;
          input_subcategory_key: string;
          input_trial_days: number;
          input_website_locale: string;
        };
        Returns: string;
      };
      create_self_service_business_site: {
        Args: {
          input_generation_payload: Json;
          input_industry_key: string;
          input_name: string;
          input_slug: string;
          input_subcategory_key: string;
          input_website_locale: string;
        };
        Returns: string;
      };
      get_company_billing_summary: {
        Args: { input_company_id: string };
        Returns: {
          account_status: string;
          active_seat_count: number;
          additional_worker_bundles: number;
          company_count: number;
          company_limit: number;
          plan_code: string;
          seat_limit: number;
          trial_ends_at: string | null;
        }[];
      };
      create_company_invitation: {
        Args: {
          input_company_id: string;
          input_email: string;
          input_role: string;
        };
        Returns: {
          accepted_at: string | null;
          accepted_by: string | null;
          company_id: string;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          role: string;
          status: string;
          updated_at: string;
        };
      };
      create_company_service_with_item: {
        Args: {
          input_company_id: string;
          input_date: string;
          input_fee: number;
          input_item_name: string;
          input_km: number;
          input_labor_cost: number;
          input_labor_discount_percent: number;
          input_material_cost: number;
          input_notes: string;
          input_type: Database["public"]["Enums"]["service_type"];
          input_vehicle_id: string;
        };
        Returns: string;
      };
      create_company_customer_with_vehicle: {
        Args: {
          input_company_id: string;
          input_first_name: string;
          input_is_vip: boolean;
          input_last_name: string;
          input_phone: string;
          input_vehicle_current_km: number | null;
          input_vehicle_model: string | null;
          input_vehicle_plate_number: string | null;
          input_vehicle_vin: string | null;
        };
        Returns: {
          client_id: string;
          vehicle_id: string | null;
        }[];
      };
      create_company_vehicle: {
        Args: {
          input_client_id: string;
          input_current_km: number;
          input_model: string;
          input_plate_number: string;
          input_vin: string | null;
        };
        Returns: string;
      };
      create_company_service_with_items: {
        Args: {
          input_company_id: string;
          input_date: string;
          input_fee: number;
          input_km: number;
          input_labor_cost: number;
          input_labor_discount_percent: number;
          input_materials?: Json;
          input_notes: string;
          input_type: Database["public"]["Enums"]["service_type"];
          input_vehicle_id: string;
          input_work_name: string;
        };
        Returns: string;
      };
      create_company_service_with_line_items: {
        Args: {
          input_company_id: string;
          input_date: string;
          input_items: Json;
          input_km: number;
          input_labor_discount_percent?: number;
          input_notes: string;
          input_type: Database["public"]["Enums"]["service_type"];
          input_vehicle_id: string;
        };
        Returns: string;
      };
      finalize_company_open_work: {
        Args: {
          input_company_id: string;
          input_due_date?: string | null;
          input_items: Json;
          input_notes?: string | null;
          input_service_id: string;
        };
        Returns: string;
      };
      create_public_appointment_request: {
        Args: {
          input_company_id: string;
          input_catalog_item_id?: string | null;
          input_customer_name: string;
          input_note?: string | null;
          input_phone: string;
          input_preferred_date?: string | null;
          input_preferred_time?: string | null;
          input_service_interest: string;
          input_vehicle_description?: string | null;
          input_vehicle_plate?: string | null;
        };
        Returns: string;
      };
      get_public_appointment_proposal: {
        Args: { input_token: string };
        Returns: {
          company_name: string;
          duration_minutes: number;
          scheduled_start: string;
          service_currency: string | null;
          service_interest: string;
          service_price: number | null;
          status: string;
          website_locale: string;
        }[];
      };
      cancel_public_appointment_proposal: {
        Args: { input_token: string };
        Returns: string;
      };
      respond_public_appointment_proposal: {
        Args: { input_response: string; input_token: string };
        Returns: string;
      };
      list_public_appointment_slots: {
        Args: {
          input_company_id: string;
          input_from: string;
          input_to: string;
        };
        Returns: {
          scheduled_date: string;
          scheduled_time: string;
          duration_minutes: number;
        }[];
      };
      schedule_company_appointment_request: {
        Args: {
          input_company_id: string;
          input_request_id: string;
          input_date: string;
          input_time: string;
          input_duration_minutes?: number;
        };
        Returns: undefined;
      };
      propose_or_confirm_company_appointment_request: {
        Args: {
          input_company_id: string;
          input_request_id: string;
          input_date: string;
          input_time: string;
          input_duration_minutes?: number;
        };
        Returns: string;
      };
      confirm_proposed_company_appointment_request: {
        Args: { input_company_id: string; input_request_id: string };
        Returns: undefined;
      };
      decline_company_appointment_request: {
        Args: { input_company_id: string; input_request_id: string };
        Returns: undefined;
      };
      cancel_company_appointment_request: {
        Args: { input_company_id: string; input_request_id: string };
        Returns: undefined;
      };
      get_public_appointment_business_hours: {
        Args: { input_company_id: string };
        Returns: {
          weekday: number;
          is_open: boolean;
          opens_at: string;
          closes_at: string;
          slot_minutes: number;
        }[];
      };
      update_company_appointment_business_hours: {
        Args: { input_company_id: string; input_hours: Json };
        Returns: undefined;
      };
      get_public_company_by_slug: {
        Args: { input_slug: string };
        Returns: {
          accent_color: string;
          address: string;
          about_body: string;
          about_title: string;
          background_color: string;
          button_radius: string;
          city: string;
          company_id: string;
          country: string;
          contact_body: string;
          contact_title: string;
          description: string;
          display_name: string;
          email: string;
          gallery_one_image_url: string;
          gallery_subtitle: string;
          gallery_three_image_url: string;
          gallery_title: string;
          gallery_two_image_url: string;
          hero_eyebrow: string;
          font_style: string;
          hero_image_url: string;
          hero_subtitle: string;
          hero_title: string;
          has_appointments: boolean;
          industry_key: string;
          industry_subcategory_key: string;
          logo_url: string;
          phone: string;
          primary_color: string;
          product_surface: string;
          service_one_description: string;
          service_one_image_url: string;
          service_one_title: string;
          service_three_description: string;
          service_three_image_url: string;
          service_three_title: string;
          service_two_description: string;
          service_two_image_url: string;
          service_two_title: string;
          slug: string;
          surface_color: string;
          text_color: string;
          whatsapp: string;
        }[];
      };
      has_company_role: {
        Args: {
          allowed_roles: string[];
          input_company_id: string;
          input_user_id: string;
        };
        Returns: boolean;
      };
      has_company_capability: {
        Args: {
          input_company_id: string;
          input_module_key: string;
          input_user_id: string;
        };
        Returns: boolean;
      };
      get_company_capabilities: {
        Args: { input_company_id: string };
        Returns: { module_key: string }[];
      };
      is_active_workshop_admin: {
        Args: { input_user_id: string };
        Returns: boolean;
      };
      is_company_member: {
        Args: { input_company_id: string; input_user_id: string };
        Returns: boolean;
      };
      is_super_admin: { Args: { input_user_id: string }; Returns: boolean };
      record_company_invoice_payment: {
        Args: {
          input_amount: number;
          input_company_id: string;
          input_invoice_id: string;
        };
        Returns: string;
      };
      revoke_company_invitation: {
        Args: { input_invitation_id: string };
        Returns: undefined;
      };
      update_company_member_access: {
        Args: {
          input_company_id: string;
          input_is_active: boolean;
          input_role: string;
          input_user_id: string;
        };
        Returns: undefined;
      };
      set_client_pin_hash: {
        Args: {
          input_owner_id: string;
          input_phone: string;
          input_pin: string;
        };
        Returns: undefined;
      };
      verify_client_pin: {
        Args: { input_phone: string; input_pin: string };
        Returns: {
          auth_user_id: string;
          client_id: string;
          owner_id: string;
        }[];
      };
    };
    Enums: {
      invoice_status: "draft" | "issued" | "partial" | "paid";
      service_type: "normal" | "periodic";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null;
          avif_autodetection: boolean | null;
          created_at: string | null;
          file_size_limit: number | null;
          id: string;
          name: string;
          owner: string | null;
          owner_id: string | null;
          public: boolean | null;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string | null;
        };
        Insert: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id: string;
          name: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string | null;
        };
        Update: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id?: string;
          name?: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string | null;
        };
        Relationships: [];
      };
      buckets_analytics: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          format: string;
          id: string;
          name: string;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name?: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Relationships: [];
      };
      buckets_vectors: {
        Row: {
          created_at: string;
          id: string;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Relationships: [];
      };
      iceberg_namespaces: {
        Row: {
          bucket_name: string;
          catalog_id: string;
          created_at: string;
          id: string;
          metadata: Json;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_name: string;
          catalog_id: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_name?: string;
          catalog_id?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey";
            columns: ["catalog_id"];
            isOneToOne: false;
            referencedRelation: "buckets_analytics";
            referencedColumns: ["id"];
          },
        ];
      };
      iceberg_tables: {
        Row: {
          bucket_name: string;
          catalog_id: string;
          created_at: string;
          id: string;
          location: string;
          name: string;
          namespace_id: string;
          remote_table_id: string | null;
          shard_id: string | null;
          shard_key: string | null;
          updated_at: string;
        };
        Insert: {
          bucket_name: string;
          catalog_id: string;
          created_at?: string;
          id?: string;
          location: string;
          name: string;
          namespace_id: string;
          remote_table_id?: string | null;
          shard_id?: string | null;
          shard_key?: string | null;
          updated_at?: string;
        };
        Update: {
          bucket_name?: string;
          catalog_id?: string;
          created_at?: string;
          id?: string;
          location?: string;
          name?: string;
          namespace_id?: string;
          remote_table_id?: string | null;
          shard_id?: string | null;
          shard_key?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey";
            columns: ["catalog_id"];
            isOneToOne: false;
            referencedRelation: "buckets_analytics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey";
            columns: ["namespace_id"];
            isOneToOne: false;
            referencedRelation: "iceberg_namespaces";
            referencedColumns: ["id"];
          },
        ];
      };
      migrations: {
        Row: {
          executed_at: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Insert: {
          executed_at?: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Update: {
          executed_at?: string | null;
          hash?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      objects: {
        Row: {
          bucket_id: string | null;
          created_at: string | null;
          id: string;
          last_accessed_at: string | null;
          metadata: Json | null;
          name: string | null;
          owner: string | null;
          owner_id: string | null;
          path_tokens: string[] | null;
          updated_at: string | null;
          user_metadata: Json | null;
          version: string | null;
        };
        Insert: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Update: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
        ];
      };
      s3_multipart_uploads: {
        Row: {
          bucket_id: string;
          created_at: string;
          id: string;
          in_progress_size: number;
          key: string;
          metadata: Json | null;
          owner_id: string | null;
          upload_signature: string;
          user_metadata: Json | null;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          id: string;
          in_progress_size?: number;
          key: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature: string;
          user_metadata?: Json | null;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          id?: string;
          in_progress_size?: number;
          key?: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature?: string;
          user_metadata?: Json | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
        ];
      };
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string;
          created_at: string;
          etag: string;
          id: string;
          key: string;
          owner_id: string | null;
          part_number: number;
          size: number;
          upload_id: string;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          etag: string;
          id?: string;
          key: string;
          owner_id?: string | null;
          part_number: number;
          size?: number;
          upload_id: string;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          etag?: string;
          id?: string;
          key?: string;
          owner_id?: string | null;
          part_number?: number;
          size?: number;
          upload_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey";
            columns: ["upload_id"];
            isOneToOne: false;
            referencedRelation: "s3_multipart_uploads";
            referencedColumns: ["id"];
          },
        ];
      };
      vector_indexes: {
        Row: {
          bucket_id: string;
          created_at: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id: string;
          metadata_configuration: Json | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id?: string;
          metadata_configuration?: Json | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          data_type?: string;
          dimension?: number;
          distance_metric?: string;
          id?: string;
          metadata_configuration?: Json | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets_vectors";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] };
        Returns: boolean;
      };
      allow_only_operation: {
        Args: { expected_operation: string };
        Returns: boolean;
      };
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string };
        Returns: undefined;
      };
      extension: { Args: { name: string }; Returns: string };
      filename: { Args: { name: string }; Returns: string };
      foldername: { Args: { name: string }; Returns: string[] };
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string };
        Returns: string;
      };
      get_size_by_bucket: {
        Args: never;
        Returns: {
          bucket_id: string;
          size: number;
        }[];
      };
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_key_token?: string;
          next_upload_token?: string;
          prefix_param: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
        }[];
      };
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_token?: string;
          prefix_param: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      operation: { Args: never; Returns: string };
      search: {
        Args: {
          bucketname: string;
          levels?: number;
          limits?: number;
          offsets?: number;
          prefix: string;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_by_timestamp: {
        Args: {
          p_bucket_id: string;
          p_level: number;
          p_limit: number;
          p_prefix: string;
          p_sort_column: string;
          p_sort_column_after: string;
          p_sort_order: string;
          p_start_after: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_v2: {
        Args: {
          bucket_name: string;
          levels?: number;
          limits?: number;
          prefix: string;
          sort_column?: string;
          sort_column_after?: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
    };
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      invoice_status: ["draft", "issued", "partial", "paid"],
      service_type: ["normal", "periodic"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const;
