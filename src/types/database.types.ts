export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: '13.0.5'
	}
	public: {
		Tables: {
			api_keys: {
				Row: {
					allowed_domains: string[] | null
					created_at: string | null
					environment: string
					id: string
					key_hash: string
					last_used_at: string | null
					name: string | null
					project_id: string | null
					revoked_at: string | null
					type: string
				}
				Insert: {
					allowed_domains?: string[] | null
					created_at?: string | null
					environment: string
					id: string
					key_hash: string
					last_used_at?: string | null
					name?: string | null
					project_id?: string | null
					revoked_at?: string | null
					type: string
				}
				Update: {
					allowed_domains?: string[] | null
					created_at?: string | null
					environment?: string
					id?: string
					key_hash?: string
					last_used_at?: string | null
					name?: string | null
					project_id?: string | null
					revoked_at?: string | null
					type?: string
				}
				Relationships: [
					{
						foreignKeyName: 'api_keys_project_id_fkey'
						columns: ['project_id']
						isOneToOne: false
						referencedRelation: 'projects'
						referencedColumns: ['id']
					}
				]
			}
			disposable_domain_sync_log: {
				Row: {
					added_domains: string[] | null
					domains_added: number
					domains_removed: number
					error_message: string | null
					id: string
					removed_domains: string[] | null
					sources: string[]
					success: boolean
					synced_at: string | null
					total_domains: number
				}
				Insert: {
					added_domains?: string[] | null
					domains_added: number
					domains_removed: number
					error_message?: string | null
					id?: string
					removed_domains?: string[] | null
					sources: string[]
					success: boolean
					synced_at?: string | null
					total_domains: number
				}
				Update: {
					added_domains?: string[] | null
					domains_added?: number
					domains_removed?: number
					error_message?: string | null
					id?: string
					removed_domains?: string[] | null
					sources?: string[]
					success?: boolean
					synced_at?: string | null
					total_domains?: number
				}
				Relationships: []
			}
			projects: {
				Row: {
					created_at: string | null
					id: string
					name: string
					settings: Json | null
					user_id: string | null
				}
				Insert: {
					created_at?: string | null
					id: string
					name: string
					settings?: Json | null
					user_id?: string | null
				}
				Update: {
					created_at?: string | null
					id?: string
					name?: string
					settings?: Json | null
					user_id?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'projects_user_id_fkey'
						columns: ['user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					}
				]
			}
			subscriptions: {
				Row: {
					billing_cycle: string | null
					cancel_at_period_end: boolean | null
					canceled_at: string | null
					created_at: string | null
					current_period_end: string
					current_period_start: string
					days_until_due: number | null
					entitlements: Json
					id: string
					price_id: string
					project_id: string | null
					status: string
					stripe_customer_id: string
					trial_end: string | null
					trial_start: string | null
					updated_at: string | null
					user_id: string | null
				}
				Insert: {
					billing_cycle?: string | null
					cancel_at_period_end?: boolean | null
					canceled_at?: string | null
					created_at?: string | null
					current_period_end: string
					current_period_start: string
					days_until_due?: number | null
					entitlements?: Json
					id: string
					price_id: string
					project_id?: string | null
					status: string
					stripe_customer_id: string
					trial_end?: string | null
					trial_start?: string | null
					updated_at?: string | null
					user_id?: string | null
				}
				Update: {
					billing_cycle?: string | null
					cancel_at_period_end?: boolean | null
					canceled_at?: string | null
					created_at?: string | null
					current_period_end?: string
					current_period_start?: string
					days_until_due?: number | null
					entitlements?: Json
					id?: string
					price_id?: string
					project_id?: string | null
					status?: string
					stripe_customer_id?: string
					trial_end?: string | null
					trial_start?: string | null
					updated_at?: string | null
					user_id?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'subscriptions_project_id_fkey'
						columns: ['project_id']
						isOneToOne: false
						referencedRelation: 'projects'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'subscriptions_user_id_fkey'
						columns: ['user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					}
				]
			}
			usage: {
				Row: {
					count: number
					id: string
					limit_exceeded_at: string | null
					month: string
					project_id: string | null
					updated_at: string | null
				}
				Insert: {
					count?: number
					id?: string
					limit_exceeded_at?: string | null
					month: string
					project_id?: string | null
					updated_at?: string | null
				}
				Update: {
					count?: number
					id?: string
					limit_exceeded_at?: string | null
					month?: string
					project_id?: string | null
					updated_at?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'usage_project_id_fkey'
						columns: ['project_id']
						isOneToOne: false
						referencedRelation: 'projects'
						referencedColumns: ['id']
					}
				]
			}
			users: {
				Row: {
					created_at: string | null
					email: string
					id: string
					stripe_customer_id: string | null
				}
				Insert: {
					created_at?: string | null
					email: string
					id?: string
					stripe_customer_id?: string | null
				}
				Update: {
					created_at?: string | null
					email?: string
					id?: string
					stripe_customer_id?: string | null
				}
				Relationships: []
			}
			validation_logs: {
				Row: {
					checks: Json
					created_at: string | null
					email_encrypted: string
					email_hash: string
					fingerprint_id: string | null
					id: string
					ip_address: unknown | null
					is_valid: boolean
					latency_ms: number | null
					project_id: string | null
					recommendation: string
					risk_score: number
					signals: string[] | null
				}
				Insert: {
					checks: Json
					created_at?: string | null
					email_encrypted: string
					email_hash: string
					fingerprint_id?: string | null
					id?: string
					ip_address?: unknown | null
					is_valid: boolean
					latency_ms?: number | null
					project_id?: string | null
					recommendation: string
					risk_score: number
					signals?: string[] | null
				}
				Update: {
					checks?: Json
					created_at?: string | null
					email_encrypted?: string
					email_hash?: string
					fingerprint_id?: string | null
					id?: string
					ip_address?: unknown | null
					is_valid?: boolean
					latency_ms?: number | null
					project_id?: string | null
					recommendation?: string
					risk_score?: number
					signals?: string[] | null
				}
				Relationships: [
					{
						foreignKeyName: 'validation_logs_project_id_fkey'
						columns: ['project_id']
						isOneToOne: false
						referencedRelation: 'projects'
						referencedColumns: ['id']
					}
				]
			}
		}
		Views: {
			[_ in never]: never
		}
		Functions: {
			delete_old_logs: {
				Args: Record<PropertyKey, never>
				Returns: undefined
			}
			reset_usage_for_project: {
				Args: { p_current_period_end: string; p_project_id: string }
				Returns: undefined
			}
		}
		Enums: {
			[_ in never]: never
		}
		CompositeTypes: {
			[_ in never]: never
		}
	}
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R
			}
			? R
			: never
		: never

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I
			}
			? I
			: never
		: never

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U
			}
			? U
			: never
		: never

export type Enums<
	DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
		: never = never
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
		? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
		: never

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never = never
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
		? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
		: never

export const Constants = {
	public: {
		Enums: {}
	}
} as const
