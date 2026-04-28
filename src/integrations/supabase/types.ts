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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categorias: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      itens_pedido: {
        Row: {
          created_at: string
          id: string
          nome_produto: string
          observacao: string | null
          pedido_id: string
          preco_unitario: number
          produto_id: string
          quantidade: number
          status: Database["public"]["Enums"]["status_item"]
          subtotal: number
          tamanho: Database["public"]["Enums"]["tamanho_item"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome_produto: string
          observacao?: string | null
          pedido_id: string
          preco_unitario: number
          produto_id: string
          quantidade?: number
          status?: Database["public"]["Enums"]["status_item"]
          subtotal: number
          tamanho?: Database["public"]["Enums"]["tamanho_item"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome_produto?: string
          observacao?: string | null
          pedido_id?: string
          preco_unitario?: number
          produto_id?: string
          quantidade?: number
          status?: Database["public"]["Enums"]["status_item"]
          subtotal?: number
          tamanho?: Database["public"]["Enums"]["tamanho_item"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_pedido_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      mesas: {
        Row: {
          capacidade: number
          created_at: string
          id: string
          numero: number
          status: Database["public"]["Enums"]["status_mesa"]
          updated_at: string
        }
        Insert: {
          capacidade?: number
          created_at?: string
          id?: string
          numero: number
          status?: Database["public"]["Enums"]["status_mesa"]
          updated_at?: string
        }
        Update: {
          capacidade?: number
          created_at?: string
          id?: string
          numero?: number
          status?: Database["public"]["Enums"]["status_mesa"]
          updated_at?: string
        }
        Relationships: []
      }
      pagamentos: {
        Row: {
          created_at: string
          forma: Database["public"]["Enums"]["forma_pagamento"]
          id: string
          observacao: string | null
          pedido_id: string
          registrado_por: string | null
          valor: number
        }
        Insert: {
          created_at?: string
          forma: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          observacao?: string | null
          pedido_id: string
          registrado_por?: string | null
          valor: number
        }
        Update: {
          created_at?: string
          forma?: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          observacao?: string | null
          pedido_id?: string
          registrado_por?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          aberto_em: string
          created_at: string
          fechado_em: string | null
          garcom_id: string | null
          id: string
          mesa_id: string
          observacao: string | null
          status: Database["public"]["Enums"]["status_pedido"]
          total: number
          updated_at: string
        }
        Insert: {
          aberto_em?: string
          created_at?: string
          fechado_em?: string | null
          garcom_id?: string | null
          id?: string
          mesa_id: string
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_pedido"]
          total?: number
          updated_at?: string
        }
        Update: {
          aberto_em?: string
          created_at?: string
          fechado_em?: string | null
          garcom_id?: string | null
          id?: string
          mesa_id?: string
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_pedido"]
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "mesas"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          categoria_id: string | null
          created_at: string
          descricao: string | null
          disponivel: boolean
          foto_url: string | null
          id: string
          nome: string
          preco_g: number | null
          preco_m: number | null
          preco_unico: number | null
          updated_at: string
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          disponivel?: boolean
          foto_url?: string | null
          id?: string
          nome: string
          preco_g?: number | null
          preco_m?: number | null
          preco_unico?: number | null
          updated_at?: string
        }
        Update: {
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          disponivel?: boolean
          foto_url?: string | null
          id?: string
          nome?: string
          preco_g?: number | null
          preco_m?: number | null
          preco_unico?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reservas: {
        Row: {
          cliente_nome: string
          cliente_telefone: string | null
          created_at: string
          criado_por: string | null
          data_hora: string
          duracao_minutos: number
          id: string
          mesa_id: string
          observacao: string | null
          pessoas: number
          status: Database["public"]["Enums"]["status_reserva"]
          updated_at: string
        }
        Insert: {
          cliente_nome: string
          cliente_telefone?: string | null
          created_at?: string
          criado_por?: string | null
          data_hora: string
          duracao_minutos?: number
          id?: string
          mesa_id: string
          observacao?: string | null
          pessoas?: number
          status?: Database["public"]["Enums"]["status_reserva"]
          updated_at?: string
        }
        Update: {
          cliente_nome?: string
          cliente_telefone?: string | null
          created_at?: string
          criado_por?: string | null
          data_hora?: string
          duracao_minutos?: number
          id?: string
          mesa_id?: string
          observacao?: string | null
          pessoas?: number
          status?: Database["public"]["Enums"]["status_reserva"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservas_mesa_id_fkey"
            columns: ["mesa_id"]
            isOneToOne: false
            referencedRelation: "mesas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "garcom" | "cozinha" | "caixa"
      forma_pagamento:
        | "dinheiro"
        | "pix"
        | "cartao_credito"
        | "cartao_debito"
        | "outro"
      status_item:
        | "pendente"
        | "preparando"
        | "pronto"
        | "entregue"
        | "cancelado"
      status_mesa: "livre" | "ocupada" | "aguardando_pagamento"
      status_pedido: "aberto" | "fechado" | "cancelado"
      status_reserva:
        | "confirmada"
        | "cancelada"
        | "concluida"
        | "no_show"
        | "em_andamento"
      tamanho_item: "M" | "G" | "UNICO"
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
      app_role: ["admin", "garcom", "cozinha", "caixa"],
      forma_pagamento: [
        "dinheiro",
        "pix",
        "cartao_credito",
        "cartao_debito",
        "outro",
      ],
      status_item: [
        "pendente",
        "preparando",
        "pronto",
        "entregue",
        "cancelado",
      ],
      status_mesa: ["livre", "ocupada", "aguardando_pagamento"],
      status_pedido: ["aberto", "fechado", "cancelado"],
      status_reserva: [
        "confirmada",
        "cancelada",
        "concluida",
        "no_show",
        "em_andamento",
      ],
      tamanho_item: ["M", "G", "UNICO"],
    },
  },
} as const
