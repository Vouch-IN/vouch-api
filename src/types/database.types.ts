export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema['CompositeTypes']
		| { schema: keyof DatabaseWithoutInternals },
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

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: '13.0.5'
	}
	public: {
		CompositeTypes: Record<never, never>
		Enums: Record<never, never>
		Functions: {
			delete_old_logs: { Args: never; Returns: undefined }
			reset_usage_for_project: {
				Args: { p_current_period_end: string; p_project_id: string }
				Returns: undefined
			}
		}
		Tables: {
			api_keys: {
				Insert: {
					allowed_domains?: null | string[]
					created_at?: null | string
					environment: string
					id: string
					key_hash: string
					last_used_at?: null | string
					name?: null | string
					project_id?: null | string
					revoked_at?: null | string
					type: string
				}
				Relationships: [
					{
						columns: ['project_id']
						foreignKeyName: 'api_keys_project_id_fkey'
						isOneToOne: false
						referencedColumns: ['id']
						referencedRelation: 'projects'
					}
				]
				Row: {
					allowed_domains: null | string[]
					created_at: null | string
					environment: string
					id: string
					key_hash: string
					last_used_at: null | string
					name: null | string
					project_id: null | string
					revoked_at: null | string
					type: string
				}
				Update: {
					allowed_domains?: null | string[]
					created_at?: null | string
					environment?: string
					id?: string
					key_hash?: string
					last_used_at?: null | string
					name?: null | string
					project_id?: null | string
					revoked_at?: null | string
					type?: string
				}
			}
			disposable_domain_sync_log: {
				Insert: {
					added_domains?: null | string[]
					domains_added: number
					domains_removed: number
					error_message?: null | string
					id?: string
					removed_domains?: null | string[]
					sources: string[]
					success: boolean
					synced_at?: null | string
					total_domains: number
				}
				Relationships: []
				Row: {
					added_domains: null | string[]
					domains_added: number
					domains_removed: number
					error_message: null | string
					id: string
					removed_domains: null | string[]
					sources: string[]
					success: boolean
					synced_at: null | string
					total_domains: number
				}
				Update: {
					added_domains?: null | string[]
					domains_added?: number
					domains_removed?: number
					error_message?: null | string
					id?: string
					removed_domains?: null | string[]
					sources?: string[]
					success?: boolean
					synced_at?: null | string
					total_domains?: number
				}
			}
			projects: {
				Insert: {
					created_at?: null | string
					id: string
					name: string
					settings?: Json | null
					user_id?: null | string
				}
				Relationships: [
					{
						columns: ['user_id']
						foreignKeyName: 'projects_user_id_fkey'
						isOneToOne: false
						referencedColumns: ['id']
						referencedRelation: 'users'
					}
				]
				Row: {
					created_at: null | string
					id: string
					name: string
					settings: Json | null
					user_id: null | string
				}
				Update: {
					created_at?: null | string
					id?: string
					name?: string
					settings?: Json | null
					user_id?: null | string
				}
			}
			subscriptions: {
				Insert: {
					billing_cycle?: null | string
					cancel_at_period_end?: boolean | null
					canceled_at?: null | string
					created_at?: null | string
					current_period_end: string
					current_period_start: string
					days_until_due?: null | number
					entitlements?: Json
					id: string
					price_id: string
					project_id?: null | string
					status: string
					stripe_customer_id: string
					trial_end?: null | string
					trial_start?: null | string
					updated_at?: null | string
					user_id?: null | string
				}
				Relationships: [
					{
						columns: ['project_id']
						foreignKeyName: 'subscriptions_project_id_fkey'
						isOneToOne: false
						referencedColumns: ['id']
						referencedRelation: 'projects'
					},
					{
						columns: ['user_id']
						foreignKeyName: 'subscriptions_user_id_fkey'
						isOneToOne: false
						referencedColumns: ['id']
						referencedRelation: 'users'
					}
				]
				Row: {
					billing_cycle: null | string
					cancel_at_period_end: boolean | null
					canceled_at: null | string
					created_at: null | string
					current_period_end: string
					current_period_start: string
					days_until_due: null | number
					entitlements: Json
					id: string
					price_id: string
					project_id: null | string
					status: string
					stripe_customer_id: string
					trial_end: null | string
					trial_start: null | string
					updated_at: null | string
					user_id: null | string
				}
				Update: {
					billing_cycle?: null | string
					cancel_at_period_end?: boolean | null
					canceled_at?: null | string
					created_at?: null | string
					current_period_end?: string
					current_period_start?: string
					days_until_due?: null | number
					entitlements?: Json
					id?: string
					price_id?: string
					project_id?: null | string
					status?: string
					stripe_customer_id?: string
					trial_end?: null | string
					trial_start?: null | string
					updated_at?: null | string
					user_id?: null | string
				}
			}
			usage: {
				Insert: {
					count?: number
					id?: string
					limit_exceeded_at?: null | string
					month: string
					project_id?: null | string
					updated_at?: null | string
				}
				Relationships: [
					{
						columns: ['project_id']
						foreignKeyName: 'usage_project_id_fkey'
						isOneToOne: false
						referencedColumns: ['id']
						referencedRelation: 'projects'
					}
				]
				Row: {
					count: number
					id: string
					limit_exceeded_at: null | string
					month: string
					project_id: null | string
					updated_at: null | string
				}
				Update: {
					count?: number
					id?: string
					limit_exceeded_at?: null | string
					month?: string
					project_id?: null | string
					updated_at?: null | string
				}
			}
			users: {
				Insert: {
					created_at?: null | string
					email: string
					id?: string
					stripe_customer_id?: null | string
				}
				Relationships: []
				Row: {
					created_at: null | string
					email: string
					id: string
					stripe_customer_id: null | string
				}
				Update: {
					created_at?: null | string
					email?: string
					id?: string
					stripe_customer_id?: null | string
				}
			}
			validation_logs: {
				Insert: {
					checks: Json
					created_at?: null | string
					email_encrypted: string
					email_hash: string
					fingerprint_id?: null | string
					id?: string
					ip_address?: unknown
					is_valid: boolean
					latency_ms?: null | number
					project_id?: null | string
					recommendation: string
					risk_score: number
					signals?: null | string[]
				}
				Relationships: [
					{
						columns: ['project_id']
						foreignKeyName: 'validation_logs_project_id_fkey'
						isOneToOne: false
						referencedColumns: ['id']
						referencedRelation: 'projects'
					}
				]
				Row: {
					checks: Json
					created_at: null | string
					email_encrypted: string
					email_hash: string
					fingerprint_id: null | string
					id: string
					ip_address: unknown
					is_valid: boolean
					latency_ms: null | number
					project_id: null | string
					recommendation: string
					risk_score: number
					signals: null | string[]
				}
				Update: {
					checks?: Json
					created_at?: null | string
					email_encrypted?: string
					email_hash?: string
					fingerprint_id?: null | string
					id?: string
					ip_address?: unknown
					is_valid?: boolean
					latency_ms?: null | number
					project_id?: null | string
					recommendation?: string
					risk_score?: number
					signals?: null | string[]
				}
			}
		}
		Views: Record<never, never>
	}
}

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema['Enums']
		| { schema: keyof DatabaseWithoutInternals },
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

export type Json = boolean | Json[] | null | number | string | { [key: string]: Json | undefined }

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
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
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
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export const Constants = {
	public: {
		Enums: {}
	}
} as const
