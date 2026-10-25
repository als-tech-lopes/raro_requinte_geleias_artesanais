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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      categorias_ingredientes: {
        Row: { ativa: boolean; created_at: string; id: string; nome: string; ordem: number; slug: string; updated_at: string }
        Insert: { ativa?: boolean; created_at?: string; id?: string; nome: string; ordem?: number; slug: string; updated_at?: string }
        Update: { ativa?: boolean; created_at?: string; id?: string; nome?: string; ordem?: number; slug?: string; updated_at?: string }
        Relationships: []
      }
      categorias_produtos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          ativo: boolean
          cidade: string | null
          cpf: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          observacoes: string | null
          origem: string | null
          rede_social: string | null
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          origem?: string | null
          rede_social?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          cidade?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string | null
          rede_social?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          chave: string
          created_at: string
          descricao: string | null
          id: string
          publica: boolean
          updated_at: string
          updated_by: string | null
          valor: Json
        }
        Insert: {
          chave: string
          created_at?: string
          descricao?: string | null
          id?: string
          publica?: boolean
          updated_at?: string
          updated_by?: string | null
          valor: Json
        }
        Update: {
          chave?: string
          created_at?: string
          descricao?: string | null
          id?: string
          publica?: boolean
          updated_at?: string
          updated_by?: string | null
          valor?: Json
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      depoimentos: {
        Row: {
          aprovado: boolean
          autorizado_publicacao: boolean
          cliente_id: string | null
          comentario: string
          created_at: string
          data_depoimento: string
          destaque: boolean
          foto_path: string | null
          id: string
          nome_publico: string
          nota: number
          updated_at: string
        }
        Insert: {
          aprovado?: boolean
          autorizado_publicacao?: boolean
          cliente_id?: string | null
          comentario: string
          created_at?: string
          data_depoimento?: string
          destaque?: boolean
          foto_path?: string | null
          id?: string
          nome_publico: string
          nota: number
          updated_at?: string
        }
        Update: {
          aprovado?: boolean
          autorizado_publicacao?: boolean
          cliente_id?: string | null
          comentario?: string
          created_at?: string
          data_depoimento?: string
          destaque?: boolean
          foto_path?: string | null
          id?: string
          nome_publico?: string
          nota?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "depoimentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean
          created_at: string
          documento: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          documento?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          documento?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      compras_ingredientes: {
        Row: {
          created_at: string
          criado_por: string
          custo_unitario_estoque: number
          data_compra: string
          id: string
          ingrediente_id: string
          observacoes: string | null
          quantidade_compra: number
          quantidade_estoque: number
          unidade_compra: Database["public"]["Enums"]["unidade_medida"]
          unidade_estoque: Database["public"]["Enums"]["unidade_medida"]
          valor_total: number
        }
        Insert: {
          created_at?: string
          criado_por: string
          custo_unitario_estoque: number
          data_compra?: string
          id?: string
          ingrediente_id: string
          observacoes?: string | null
          quantidade_compra: number
          quantidade_estoque: number
          unidade_compra: Database["public"]["Enums"]["unidade_medida"]
          unidade_estoque: Database["public"]["Enums"]["unidade_medida"]
          valor_total: number
        }
        Update: {
          created_at?: string
          criado_por?: string
          custo_unitario_estoque?: number
          data_compra?: string
          id?: string
          ingrediente_id?: string
          observacoes?: string | null
          quantidade_compra?: number
          quantidade_estoque?: number
          unidade_compra?: Database["public"]["Enums"]["unidade_medida"]
          unidade_estoque?: Database["public"]["Enums"]["unidade_medida"]
          valor_total?: number
        }
        Relationships: [
          { foreignKeyName: "compras_ingredientes_ingrediente_id_fkey"; columns: ["ingrediente_id"]; isOneToOne: false; referencedRelation: "ingredientes"; referencedColumns: ["id"] },
          { foreignKeyName: "compras_ingredientes_criado_por_fkey"; columns: ["criado_por"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      ingredientes: {
        Row: {
          ativo: boolean
          categoria_id: string
          created_at: string
          custo_medio: number
          estoque_minimo: number
          fornecedor_id: string | null
          id: string
          nome: string
          observacoes: string | null
          quantidade_disponivel: number
          unidade_estoque: Database["public"]["Enums"]["unidade_medida"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_id: string
          created_at?: string
          custo_medio?: number
          estoque_minimo?: number
          fornecedor_id?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          quantidade_disponivel?: number
          unidade_estoque: Database["public"]["Enums"]["unidade_medida"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_id?: string
          created_at?: string
          custo_medio?: number
          estoque_minimo?: number
          fornecedor_id?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          quantidade_disponivel?: number
          unidade_estoque?: Database["public"]["Enums"]["unidade_medida"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredientes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_ingredientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredientes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      midias: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          metadados: Json
          ordem: number
          publico: boolean
          storage_path: string
          tipo: Database["public"]["Enums"]["midia_tipo"]
          titulo: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          metadados?: Json
          ordem?: number
          publico?: boolean
          storage_path: string
          tipo: Database["public"]["Enums"]["midia_tipo"]
          titulo: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          metadados?: Json
          ordem?: number
          publico?: boolean
          storage_path?: string
          tipo?: Database["public"]["Enums"]["midia_tipo"]
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      movimentacoes_estoque: {
        Row: {
          compra_ingrediente_id: string | null
          created_at: string
          custo_unitario: number | null
          id: string
          ingrediente_id: string | null
          item_tipo: Database["public"]["Enums"]["item_estoque_tipo"]
          lote_produto_id: string | null
          observacoes: string | null
          origem: Database["public"]["Enums"]["movimentacao_origem"]
          producao_id: string | null
          produto_id: string | null
          quantidade: number
          saldo_anterior: number
          saldo_posterior: number
          tipo: Database["public"]["Enums"]["movimentacao_tipo"]
          unidade_item: Database["public"]["Enums"]["unidade_medida"] | null
          usuario_id: string
          valor_total: number | null
          venda_id: string | null
        }
        Insert: {
          compra_ingrediente_id?: string | null
          created_at?: string
          custo_unitario?: number | null
          id?: string
          ingrediente_id?: string | null
          item_tipo: Database["public"]["Enums"]["item_estoque_tipo"]
          lote_produto_id?: string | null
          observacoes?: string | null
          origem: Database["public"]["Enums"]["movimentacao_origem"]
          producao_id?: string | null
          produto_id?: string | null
          quantidade: number
          saldo_anterior: number
          saldo_posterior: number
          tipo: Database["public"]["Enums"]["movimentacao_tipo"]
          unidade_item?: Database["public"]["Enums"]["unidade_medida"] | null
          usuario_id: string
          valor_total?: number | null
          venda_id?: string | null
        }
        Update: {
          compra_ingrediente_id?: string | null
          created_at?: string
          custo_unitario?: number | null
          id?: string
          ingrediente_id?: string | null
          item_tipo?: Database["public"]["Enums"]["item_estoque_tipo"]
          lote_produto_id?: string | null
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["movimentacao_origem"]
          producao_id?: string | null
          produto_id?: string | null
          quantidade?: number
          saldo_anterior?: number
          saldo_posterior?: number
          tipo?: Database["public"]["Enums"]["movimentacao_tipo"]
          unidade_item?: Database["public"]["Enums"]["unidade_medida"] | null
          usuario_id?: string
          valor_total?: number | null
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_compra_ingrediente_id_fkey"
            columns: ["compra_ingrediente_id"]
            isOneToOne: false
            referencedRelation: "compras_ingredientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_ingrediente_id_fkey"
            columns: ["ingrediente_id"]
            isOneToOne: false
            referencedRelation: "ingredientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_lote_produto_id_fkey"
            columns: ["lote_produto_id"]
            isOneToOne: false
            referencedRelation: "lotes_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_producao_id_fkey"
            columns: ["producao_id"]
            isOneToOne: false
            referencedRelation: "producoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "catalogo_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes_produtos: {
        Row: { id: string; producao_id: string; produto_id: string; codigo: string; data_producao: string; validade: string; quantidade_inicial: number; quantidade_disponivel: number; bloqueado: boolean; motivo_bloqueio: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; producao_id: string; produto_id: string; codigo: string; data_producao: string; validade: string; quantidade_inicial: number; quantidade_disponivel: number; bloqueado?: boolean; motivo_bloqueio?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; producao_id?: string; produto_id?: string; codigo?: string; data_producao?: string; validade?: string; quantidade_inicial?: number; quantidade_disponivel?: number; bloqueado?: boolean; motivo_bloqueio?: string | null; created_at?: string; updated_at?: string }
        Relationships: [
          { foreignKeyName: "lotes_produtos_producao_id_fkey"; columns: ["producao_id"]; isOneToOne: true; referencedRelation: "producoes"; referencedColumns: ["id"] },
          { foreignKeyName: "lotes_produtos_produto_id_fkey"; columns: ["produto_id"]; isOneToOne: false; referencedRelation: "produtos"; referencedColumns: ["id"] },
        ]
      }
      producao_itens: {
        Row: {
          created_at: string
          custo_total: number
          custo_unitario: number
          id: string
          ingrediente_id: string
          producao_id: string
          quantidade_prevista: number
          quantidade_utilizada: number
          tipo_custo: string
          unidade: Database["public"]["Enums"]["unidade_medida"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          custo_total: number
          custo_unitario: number
          id?: string
          ingrediente_id: string
          producao_id: string
          quantidade_prevista: number
          quantidade_utilizada: number
          tipo_custo?: string
          unidade: Database["public"]["Enums"]["unidade_medida"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          custo_total?: number
          custo_unitario?: number
          id?: string
          ingrediente_id?: string
          producao_id?: string
          quantidade_prevista?: number
          quantidade_utilizada?: number
          tipo_custo?: string
          unidade?: Database["public"]["Enums"]["unidade_medida"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producao_itens_ingrediente_id_fkey"
            columns: ["ingrediente_id"]
            isOneToOne: false
            referencedRelation: "ingredientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producao_itens_producao_id_fkey"
            columns: ["producao_id"]
            isOneToOne: false
            referencedRelation: "producoes"
            referencedColumns: ["id"]
          },
        ]
      }
      producoes: {
        Row: {
          cancelada_em: string | null
          cancelada_por: string | null
          concluida_em: string | null
          created_at: string
          criado_por: string
          custo_embalagens: number
          custo_ingredientes: number
          custo_por_pote: number | null
          custo_real: number
          data_producao: string
          id: string
          lote: string | null
          motivo_diferenca: string | null
          multiplicador_receita: number
          observacoes: string | null
          peso_final_g: number | null
          produto_id: string
          quantidade_planejada: number
          quantidade_produzida: number | null
          receita_id: string
          status: Database["public"]["Enums"]["producao_status"]
          updated_at: string
          validade: string | null
        }
        Insert: {
          cancelada_em?: string | null
          cancelada_por?: string | null
          concluida_em?: string | null
          created_at?: string
          criado_por: string
          custo_embalagens?: number
          custo_ingredientes?: number
          custo_por_pote?: number | null
          custo_real?: number
          data_producao?: string
          id?: string
          lote?: string | null
          motivo_diferenca?: string | null
          multiplicador_receita?: number
          observacoes?: string | null
          peso_final_g?: number | null
          produto_id: string
          quantidade_planejada: number
          quantidade_produzida?: number | null
          receita_id: string
          status?: Database["public"]["Enums"]["producao_status"]
          updated_at?: string
          validade?: string | null
        }
        Update: {
          cancelada_em?: string | null
          cancelada_por?: string | null
          concluida_em?: string | null
          created_at?: string
          criado_por?: string
          custo_embalagens?: number
          custo_ingredientes?: number
          custo_por_pote?: number | null
          custo_real?: number
          data_producao?: string
          id?: string
          lote?: string | null
          motivo_diferenca?: string | null
          multiplicador_receita?: number
          observacoes?: string | null
          peso_final_g?: number | null
          produto_id?: string
          quantidade_planejada?: number
          quantidade_produzida?: number | null
          receita_id?: string
          status?: Database["public"]["Enums"]["producao_status"]
          updated_at?: string
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "producoes_cancelada_por_fkey"
            columns: ["cancelada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producoes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "catalogo_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producoes_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_imagens: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          ordem: number
          produto_id: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          ordem?: number
          produto_id: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          ordem?: number
          produto_id?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_imagens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "catalogo_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_imagens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          alergenos: string | null
          categoria_id: string
          created_at: string
          custo_estimado: number
          conservacao: string | null
          descricao: string | null
          descricao_curta: string
          destaque: boolean
          id: string
          imagem_principal_path: string | null
          ingredientes_publicos: string | null
          nome: string
          peso_liquido: number
          preco_venda: number
          publicado: boolean
          quantidade_disponivel: number
          slug: string
          status: Database["public"]["Enums"]["produto_status"]
          observacoes_rotulagem: string | null
          unidade: Database["public"]["Enums"]["unidade_medida"]
          updated_at: string
        }
        Insert: {
          alergenos?: string | null
          categoria_id: string
          created_at?: string
          custo_estimado?: number
          conservacao?: string | null
          descricao?: string | null
          descricao_curta: string
          destaque?: boolean
          id?: string
          imagem_principal_path?: string | null
          ingredientes_publicos?: string | null
          nome: string
          peso_liquido: number
          preco_venda: number
          publicado?: boolean
          quantidade_disponivel?: number
          slug: string
          status?: Database["public"]["Enums"]["produto_status"]
          observacoes_rotulagem?: string | null
          unidade: Database["public"]["Enums"]["unidade_medida"]
          updated_at?: string
        }
        Update: {
          alergenos?: string | null
          categoria_id?: string
          created_at?: string
          custo_estimado?: number
          conservacao?: string | null
          descricao?: string | null
          descricao_curta?: string
          destaque?: boolean
          id?: string
          imagem_principal_path?: string | null
          ingredientes_publicos?: string | null
          nome?: string
          peso_liquido?: number
          preco_venda?: number
          publicado?: boolean
          quantidade_disponivel?: number
          slug?: string
          status?: Database["public"]["Enums"]["produto_status"]
          observacoes_rotulagem?: string | null
          unidade?: Database["public"]["Enums"]["unidade_medida"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "catalogo_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          papel: Database["public"]["Enums"]["perfil_papel"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id: string
          nome: string
          papel?: Database["public"]["Enums"]["perfil_papel"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          papel?: Database["public"]["Enums"]["perfil_papel"]
          updated_at?: string
        }
        Relationships: []
      }
      receita_itens: {
        Row: {
          created_at: string
          id: string
          ingrediente_id: string
          quantidade: number
          receita_id: string
          unidade: Database["public"]["Enums"]["unidade_medida"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingrediente_id: string
          quantidade: number
          receita_id: string
          unidade: Database["public"]["Enums"]["unidade_medida"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ingrediente_id?: string
          quantidade?: number
          receita_id?: string
          unidade?: Database["public"]["Enums"]["unidade_medida"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receita_itens_ingrediente_id_fkey"
            columns: ["ingrediente_id"]
            isOneToOne: false
            referencedRelation: "ingredientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receita_itens_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
        ]
      }
      receitas: {
        Row: {
          ativa: boolean
          created_at: string
          descricao: string | null
          id: string
          modo_preparo: string | null
          nome: string
          observacoes: string | null
          peso_pote_g: number
          produto_id: string | null
          receita_origem_id: string | null
          rendimento_estimado_g: number
          rendimento_potes: number
          updated_at: string
          versao: number
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          modo_preparo?: string | null
          nome: string
          observacoes?: string | null
          peso_pote_g: number
          produto_id?: string | null
          receita_origem_id?: string | null
          rendimento_estimado_g: number
          rendimento_potes: number
          updated_at?: string
          versao?: number
        }
        Update: {
          ativa?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          modo_preparo?: string | null
          nome?: string
          observacoes?: string | null
          peso_pote_g?: number
          produto_id?: string | null
          receita_origem_id?: string | null
          rendimento_estimado_g?: number
          rendimento_potes?: number
          updated_at?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "receitas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "catalogo_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receitas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: { id: string; venda_id: string; valor: number; forma_pagamento: Database["public"]["Enums"]["forma_pagamento"]; recebido_em: string; recebido_por: string; created_at: string }
        Insert: { id?: string; venda_id: string; valor: number; forma_pagamento: Database["public"]["Enums"]["forma_pagamento"]; recebido_em?: string; recebido_por: string; created_at?: string }
        Update: { id?: string; venda_id?: string; valor?: number; forma_pagamento?: Database["public"]["Enums"]["forma_pagamento"]; recebido_em?: string; recebido_por?: string; created_at?: string }
        Relationships: [
          { foreignKeyName: "pagamentos_venda_id_fkey"; columns: ["venda_id"]; isOneToOne: true; referencedRelation: "vendas"; referencedColumns: ["id"] },
          { foreignKeyName: "pagamentos_recebido_por_fkey"; columns: ["recebido_por"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      estornos_financeiros: {
        Row: { id: string; venda_id: string; pagamento_id: string | null; valor: number; status: string; motivo: string; realizado_em: string | null; criado_por: string; created_at: string }
        Insert: { id?: string; venda_id: string; pagamento_id?: string | null; valor: number; status: string; motivo: string; realizado_em?: string | null; criado_por: string; created_at?: string }
        Update: { id?: string; venda_id?: string; pagamento_id?: string | null; valor?: number; status?: string; motivo?: string; realizado_em?: string | null; criado_por?: string; created_at?: string }
        Relationships: [
          { foreignKeyName: "estornos_financeiros_venda_id_fkey"; columns: ["venda_id"]; isOneToOne: true; referencedRelation: "vendas"; referencedColumns: ["id"] },
          { foreignKeyName: "estornos_financeiros_pagamento_id_fkey"; columns: ["pagamento_id"]; isOneToOne: false; referencedRelation: "pagamentos"; referencedColumns: ["id"] },
          { foreignKeyName: "estornos_financeiros_criado_por_fkey"; columns: ["criado_por"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      venda_item_lotes: {
        Row: { id: string; venda_item_id: string; lote_produto_id: string; quantidade: number; created_at: string }
        Insert: { id?: string; venda_item_id: string; lote_produto_id: string; quantidade: number; created_at?: string }
        Update: { id?: string; venda_item_id?: string; lote_produto_id?: string; quantidade?: number; created_at?: string }
        Relationships: [
          { foreignKeyName: "venda_item_lotes_venda_item_id_fkey"; columns: ["venda_item_id"]; isOneToOne: false; referencedRelation: "venda_itens"; referencedColumns: ["id"] },
          { foreignKeyName: "venda_item_lotes_lote_produto_id_fkey"; columns: ["lote_produto_id"]; isOneToOne: false; referencedRelation: "lotes_produtos"; referencedColumns: ["id"] },
        ]
      }
      venda_itens: {
        Row: {
          created_at: string
          desconto: number
          id: string
          preco_unitario: number
          produto_id: string
          produto_nome: string
          quantidade: number
          subtotal: number
          venda_id: string
        }
        Insert: {
          created_at?: string
          desconto?: number
          id?: string
          preco_unitario: number
          produto_id: string
          produto_nome: string
          quantidade: number
          subtotal: number
          venda_id: string
        }
        Update: {
          created_at?: string
          desconto?: number
          id?: string
          preco_unitario?: number
          produto_id?: string
          produto_nome?: string
          quantidade?: number
          subtotal?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venda_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "catalogo_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venda_itens_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          cancelada_em: string | null
          cancelada_por: string | null
          cliente_id: string | null
          created_at: string
          criado_por: string
          data_venda: string
          desconto_total: number
          entregue: boolean
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"]
          id: string
          chave_idempotencia: string | null
          numero: string
          observacoes: string | null
          status: Database["public"]["Enums"]["venda_status"]
          subtotal: number
          taxa_entrega: number
          updated_at: string
          valor_total: number
        }
        Insert: {
          cancelada_em?: string | null
          cancelada_por?: string | null
          cliente_id?: string | null
          created_at?: string
          criado_por: string
          data_venda?: string
          desconto_total?: number
          entregue?: boolean
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          chave_idempotencia?: string | null
          numero: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["venda_status"]
          subtotal: number
          taxa_entrega?: number
          updated_at?: string
          valor_total: number
        }
        Update: {
          cancelada_em?: string | null
          cancelada_por?: string | null
          cliente_id?: string | null
          created_at?: string
          criado_por?: string
          data_venda?: string
          desconto_total?: number
          entregue?: boolean
          forma_pagamento?: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          chave_idempotencia?: string | null
          numero?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["venda_status"]
          subtotal?: number
          taxa_entrega?: number
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_cancelada_por_fkey"
            columns: ["cancelada_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      catalogo_categorias: {
        Row: {
          descricao: string | null
          id: string | null
          nome: string | null
          ordem: number | null
          slug: string | null
        }
        Insert: {
          descricao?: string | null
          id?: string | null
          nome?: string | null
          ordem?: number | null
          slug?: string | null
        }
        Update: {
          descricao?: string | null
          id?: string | null
          nome?: string | null
          ordem?: number | null
          slug?: string | null
        }
        Relationships: []
      }
      catalogo_configuracoes: {
        Row: {
          chave: string | null
          valor: Json | null
        }
        Insert: {
          chave?: string | null
          valor?: Json | null
        }
        Update: {
          chave?: string | null
          valor?: Json | null
        }
        Relationships: []
      }
      catalogo_depoimentos: {
        Row: {
          comentario: string | null
          data_depoimento: string | null
          destaque: boolean | null
          foto_path: string | null
          id: string | null
          nome_publico: string | null
          nota: number | null
        }
        Insert: {
          comentario?: string | null
          data_depoimento?: string | null
          destaque?: boolean | null
          foto_path?: string | null
          id?: string | null
          nome_publico?: string | null
          nota?: number | null
        }
        Update: {
          comentario?: string | null
          data_depoimento?: string | null
          destaque?: boolean | null
          foto_path?: string | null
          id?: string | null
          nome_publico?: string | null
          nota?: number | null
        }
        Relationships: []
      }
      catalogo_midias: {
        Row: {
          alt_text: string | null
          id: string | null
          metadados: Json | null
          ordem: number | null
          storage_path: string | null
          tipo: Database["public"]["Enums"]["midia_tipo"] | null
          titulo: string | null
        }
        Insert: {
          alt_text?: string | null
          id?: string | null
          metadados?: Json | null
          ordem?: number | null
          storage_path?: string | null
          tipo?: Database["public"]["Enums"]["midia_tipo"] | null
          titulo?: string | null
        }
        Update: {
          alt_text?: string | null
          id?: string | null
          metadados?: Json | null
          ordem?: number | null
          storage_path?: string | null
          tipo?: Database["public"]["Enums"]["midia_tipo"] | null
          titulo?: string | null
        }
        Relationships: []
      }
      catalogo_produto_imagens: {
        Row: {
          alt_text: string | null
          id: string | null
          ordem: number | null
          produto_id: string | null
          storage_path: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produto_imagens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "catalogo_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_imagens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_produtos: {
        Row: {
          alergenos: string | null
          categoria_id: string | null
          categoria_nome: string | null
          categoria_slug: string | null
          conservacao: string | null
          descricao: string | null
          descricao_curta: string | null
          destaque: boolean | null
          id: string | null
          imagem_principal_path: string | null
          ingredientes_publicos: string | null
          nome: string | null
          observacoes_rotulagem: string | null
          peso_liquido: number | null
          preco_venda: number | null
          disponivel: boolean | null
          slug: string | null
          unidade: Database["public"]["Enums"]["unidade_medida"] | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "catalogo_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      ajustar_estoque_ingrediente: {
        Args: { p_ingrediente_id: string; p_motivo: string; p_novo_saldo: number; p_observacoes?: string }
        Returns: string
      }
      ajustar_estoque: {
        Args: {
          p_item_id: string
          p_item_tipo: Database["public"]["Enums"]["item_estoque_tipo"]
          p_novo_saldo: number
          p_observacoes: string
        }
        Returns: string
      }
      cancelar_venda: {
        Args: { p_observacoes?: string; p_venda_id: string }
        Returns: undefined
      }
      converter_quantidade: {
        Args: {
          p_quantidade: number
          p_unidade_destino: Database["public"]["Enums"]["unidade_medida"]
          p_unidade_origem: Database["public"]["Enums"]["unidade_medida"]
        }
        Returns: number
      }
      excluir_ingrediente: {
        Args: { p_ingrediente_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      inativar_receita: {
        Args: { p_receita_id: string }
        Returns: undefined
      }
      cadastrar_ingrediente: {
        Args: {
          p_categoria_id: string
          p_estoque_minimo?: number
          p_nome: string
          p_observacoes?: string
          p_quantidade_inicial?: number
          p_unidade_estoque: Database["public"]["Enums"]["unidade_medida"]
          p_valor_total_inicial?: number
        }
        Returns: string
      }
      registrar_compra_ingrediente: {
        Args: {
          p_data_compra?: string
          p_ingrediente_id: string
          p_observacoes?: string
          p_quantidade: number
          p_unidade: Database["public"]["Enums"]["unidade_medida"]
          p_valor_total: number
        }
        Returns: string
      }
      salvar_receita: {
        Args: {
          p_ativa: boolean
          p_descricao: string | null
          p_itens: Json
          p_modo_preparo: string | null
          p_nome: string
          p_observacoes: string | null
          p_peso_pote_g: number
          p_produto_id: string | null
          p_receita_id: string | null
          p_rendimento_estimado_g: number
        }
        Returns: string
      }
      salvar_producao_em_preparo: {
        Args: {
          p_data_producao: string
          p_itens?: Json | null
          p_motivo_diferenca?: string | null
          p_multiplicador: number
          p_observacoes?: string | null
          p_peso_final_g?: number | null
          p_producao_id: string | null
          p_quantidade_produzida?: number | null
          p_receita_id: string
          p_validade?: string | null
        }
        Returns: string
      }
      concluir_producao: {
        Args: { p_producao_id: string }
        Returns: Json
      }
      cancelar_producao_em_preparo: {
        Args: { p_motivo: string; p_producao_id: string }
        Returns: undefined
      }
      registrar_perda_producao: { Args: { p_motivo: string; p_producao_id: string }; Returns: undefined }
      obter_dias_alerta_validade: { Args: never; Returns: number }
      registrar_producao: {
        Args: {
          p_data_producao: string
          p_lote: string
          p_observacoes?: string
          p_produto_id: string
          p_quantidade_planejada: number
          p_quantidade_produzida: number
          p_receita_id: string
          p_validade: string
        }
        Returns: string
      }
      registrar_venda: {
        Args: {
          p_cliente_id: string
          p_desconto_total?: number
          p_forma_pagamento: Database["public"]["Enums"]["forma_pagamento"]
          p_itens: Json
          p_observacoes?: string
          p_status?: Database["public"]["Enums"]["venda_status"]
        }
        Returns: string
      }
      registrar_venda_segura: {
        Args: {
          p_chave_idempotencia: string
          p_cliente_id: string | null
          p_desconto_total?: number
          p_forma_pagamento: Database["public"]["Enums"]["forma_pagamento"]
          p_itens: Json
          p_observacoes?: string | null
          p_status?: Database["public"]["Enums"]["venda_status"]
          p_taxa_entrega?: number
        }
        Returns: Json
      }
      registrar_pagamento_venda: {
        Args: { p_forma_pagamento: Database["public"]["Enums"]["forma_pagamento"]; p_venda_id: string }
        Returns: string
      }
      cancelar_venda_segura: {
        Args: { p_estorno_realizado?: boolean; p_motivo: string; p_retornar_estoque?: boolean; p_venda_id: string }
        Returns: undefined
      }
      confirmar_estorno_financeiro: { Args: { p_venda_id: string }; Returns: undefined }
      data_operacao_local: { Args: never; Returns: string }
      catalogo_validar_sacola: {
        Args: { p_itens: Json }
        Returns: {
          produto_id: string
          nome: string | null
          slug: string | null
          peso_liquido: number | null
          unidade: Database["public"]["Enums"]["unidade_medida"] | null
          preco_venda: number | null
          imagem_principal_path: string | null
          quantidade_solicitada: number
          valido: boolean
          motivo: string | null
        }[]
      }
    }
    Enums: {
      forma_pagamento:
        | "PIX"
        | "DINHEIRO"
        | "CARTAO_CREDITO"
        | "CARTAO_DEBITO"
        | "TRANSFERENCIA"
      item_estoque_tipo: "INGREDIENTE" | "PRODUTO"
      midia_tipo: "BANNER" | "PRODUCAO" | "INSTITUCIONAL" | "DIVULGACAO"
      movimentacao_origem:
        | "MANUAL"
        | "COMPRA"
        | "PRODUCAO"
        | "VENDA"
        | "CANCELAMENTO"
      movimentacao_tipo:
        | "ENTRADA"
        | "SAIDA"
        | "AJUSTE"
        | "PRODUCAO"
        | "VENDA"
        | "CANCELAMENTO"
      perfil_papel: "ADMIN" | "OPERADOR"
      producao_status: "RASCUNHO" | "CONFIRMADA" | "CANCELADA"
      produto_status: "ATIVO" | "INATIVO" | "ESGOTADO"
      unidade_medida: "kg" | "g" | "L" | "ml" | "unidade"
      venda_status: "PENDENTE" | "PAGA" | "CANCELADA"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      forma_pagamento: [
        "PIX",
        "DINHEIRO",
        "CARTAO_CREDITO",
        "CARTAO_DEBITO",
        "TRANSFERENCIA",
      ],
      item_estoque_tipo: ["INGREDIENTE", "PRODUTO"],
      midia_tipo: ["BANNER", "PRODUCAO", "INSTITUCIONAL", "DIVULGACAO"],
      movimentacao_origem: [
        "MANUAL",
        "COMPRA",
        "PRODUCAO",
        "VENDA",
        "CANCELAMENTO",
      ],
      movimentacao_tipo: [
        "ENTRADA",
        "SAIDA",
        "AJUSTE",
        "PRODUCAO",
        "VENDA",
        "CANCELAMENTO",
      ],
      perfil_papel: ["ADMIN", "OPERADOR"],
      producao_status: ["RASCUNHO", "CONFIRMADA", "CANCELADA"],
      produto_status: ["ATIVO", "INATIVO", "ESGOTADO"],
      unidade_medida: ["kg", "g", "L", "ml", "unidade"],
      venda_status: ["PENDENTE", "PAGA", "CANCELADA"],
    },
  },
} as const
