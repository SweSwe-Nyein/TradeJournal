export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      trading_accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          account_type: 'personal' | 'prop_firm' | 'demo';
          broker_name: string | null;
          starting_balance: number;
          current_balance: number;
          currency: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          account_type: 'personal' | 'prop_firm' | 'demo';
          broker_name?: string | null;
          starting_balance: number;
          current_balance?: number;
          currency?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          account_type?: 'personal' | 'prop_firm' | 'demo';
          broker_name?: string | null;
          starting_balance?: number;
          current_balance?: number;
          currency?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trading_accounts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      trades: {
        Row: {
          id: string;
          user_id: string;
          trading_account_id: string;
          symbol: string;
          direction: 'long' | 'short';
          entry_time: string;
          exit_time: string | null;
          entry_price: number;
          exit_price: number | null;
          quantity: number;
          stop_loss: number | null;
          take_profit: number | null;
          commission: number;
          fees: number;
          swap: number;
          gross_pnl: number;
          net_pnl: number;
          risk_amount: number | null;
          r_multiple: number | null;
          status: 'open' | 'closed';
          notes: string | null;
          strategy: string | null;
          tags: string[] | null;
          mistakes: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trading_account_id: string;
          symbol: string;
          direction: 'long' | 'short';
          entry_time: string;
          exit_time?: string | null;
          entry_price: number;
          exit_price?: number | null;
          quantity: number;
          stop_loss?: number | null;
          take_profit?: number | null;
          commission?: number;
          fees?: number;
          swap?: number;
          gross_pnl?: number;
          net_pnl?: number;
          risk_amount?: number | null;
          r_multiple?: number | null;
          status?: 'open' | 'closed';
          notes?: string | null;
          strategy?: string | null;
          tags?: string[] | null;
          mistakes?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          trading_account_id?: string;
          symbol?: string;
          direction?: 'long' | 'short';
          entry_time?: string;
          exit_time?: string | null;
          entry_price?: number;
          exit_price?: number | null;
          quantity?: number;
          stop_loss?: number | null;
          take_profit?: number | null;
          commission?: number;
          fees?: number;
          swap?: number;
          gross_pnl?: number;
          net_pnl?: number;
          risk_amount?: number | null;
          r_multiple?: number | null;
          status?: 'open' | 'closed';
          notes?: string | null;
          strategy?: string | null;
          tags?: string[] | null;
          mistakes?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trades_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trades_trading_account_id_fkey";
            columns: ["trading_account_id"];
            isOneToOne: false;
            referencedRelation: "trading_accounts";
            referencedColumns: ["id"];
          }
        ];
      };
      strategies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "strategies_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      trade_strategies: {
        Row: {
          id: string;
          user_id: string;
          trade_id: string;
          strategy_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trade_id: string;
          strategy_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          trade_id?: string;
          strategy_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trade_strategies_trade_id_fkey";
            columns: ["trade_id"];
            isOneToOne: false;
            referencedRelation: "trades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trade_strategies_strategy_id_fkey";
            columns: ["strategy_id"];
            isOneToOne: false;
            referencedRelation: "strategies";
            referencedColumns: ["id"];
          }
        ];
      };
      tags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tags_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      trade_tags: {
        Row: {
          id: string;
          user_id: string;
          trade_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trade_id: string;
          tag_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          trade_id?: string;
          tag_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trade_tags_trade_id_fkey";
            columns: ["trade_id"];
            isOneToOne: false;
            referencedRelation: "trades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trade_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          }
        ];
      };
      mistakes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mistakes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      trade_mistakes: {
        Row: {
          id: string;
          user_id: string;
          trade_id: string;
          mistake_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trade_id: string;
          mistake_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          trade_id?: string;
          mistake_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trade_mistakes_trade_id_fkey";
            columns: ["trade_id"];
            isOneToOne: false;
            referencedRelation: "trades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trade_mistakes_mistake_id_fkey";
            columns: ["mistake_id"];
            isOneToOne: false;
            referencedRelation: "mistakes";
            referencedColumns: ["id"];
          }
        ];
      };
      journal_entries: {
        Row: {
          id: string;
          user_id: string;
          trading_account_id: string | null;
          date: string;
          title: string | null;
          content: string;
          mood: 'Excellent' | 'Good' | 'Neutral' | 'Bad' | 'Terrible' | null;
          discipline_score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trading_account_id?: string | null;
          date: string;
          title?: string | null;
          content: string;
          mood?: 'Excellent' | 'Good' | 'Neutral' | 'Bad' | 'Terrible' | null;
          discipline_score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          trading_account_id?: string | null;
          date?: string;
          title?: string | null;
          content?: string;
          mood?: 'Excellent' | 'Good' | 'Neutral' | 'Bad' | 'Terrible' | null;
          discipline_score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "journal_entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "journal_entries_trading_account_id_fkey";
            columns: ["trading_account_id"];
            isOneToOne: false;
            referencedRelation: "trading_accounts";
            referencedColumns: ["id"];
          }
        ];
      };
      trade_screenshots: {
        Row: {
          id: string;
          user_id: string;
          trade_id: string;
          storage_path: string;
          screenshot_type: 'Before Entry' | 'During Trade' | 'After Exit' | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trade_id: string;
          storage_path: string;
          screenshot_type?: 'Before Entry' | 'During Trade' | 'After Exit' | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          trade_id?: string;
          storage_path?: string;
          screenshot_type?: 'Before Entry' | 'During Trade' | 'After Exit' | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trade_screenshots_trade_id_fkey";
            columns: ["trade_id"];
            isOneToOne: false;
            referencedRelation: "trades";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      account_type: 'personal' | 'prop_firm' | 'demo';
      trade_direction: 'long' | 'short';
      trade_status: 'open' | 'closed';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
