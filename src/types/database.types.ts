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
			can_manage_project: {
				Args: { project_id_param: string }
				Returns: boolean
			}
			delete_old_logs: { Args: never; Returns: undefined }
			delete_project_cascade: {
				Args: { project_id_param: string }
				Returns: Json
			}
			generate_api_key: {
				Args: { environment: string; type: string }
				Returns: string
			}
			get_all_validation_logs_daily: {
				Args: { p_end_date?: string; p_limit?: number; p_start_date?: string }
				Returns: {
					allowed: number
					avg_latency_ms: number
					blocked: number
					count: number
					date: string
					first_validation: string
					flagged: number
					last_refreshed: string
					last_validation: string
					project_id: string
				}[]
			}
			get_project_entitlements: {
				Args: { p_project_id: string }
				Returns: {
					features: string[]
					first_entitlement_start: string
					is_active: boolean
					last_refreshed: string
					latest_entitlement_end: string
					log_retention_days: number
					owner_id: string
					project_id: string
					project_name: string
					project_slug: string
					sources: string[]
					subscription_info: Json
					team_limit: number
					validations_limit: number
				}[]
			}
			get_validation_logs_daily: {
				Args: {
					p_end_date?: string
					p_limit?: number
					p_project_id: string
					p_start_date?: string
				}
				Returns: {
					allowed: number
					avg_latency_ms: number
					blocked: number
					count: number
					date: string
					first_validation: string
					flagged: number
					last_refreshed: string
					last_validation: string
					project_id: string
				}[]
			}
			has_project_access: {
				Args: { project_id_param: string }
				Returns: boolean
			}
			hash_api_key: { Args: { key_value: string }; Returns: string }
			is_project_admin: { Args: { project_id_param: string }; Returns: boolean }
			is_project_member: {
				Args: { project_id_param: string }
				Returns: boolean
			}
			is_project_owner: { Args: { project_id_param: string }; Returns: boolean }
			is_service_role: { Args: never; Returns: boolean }
			is_superadmin: { Args: never; Returns: boolean }
			refresh_validation_logs_daily: { Args: never; Returns: undefined }
		}
		Tables: {
			api_keys: {
				Insert: {
					allowed_domains?: null | string[]
					created_at?: string
					environment: string
					id?: string
					key_hash: string
					key_value?: null | string
					last_used_at?: null | string
					name?: null | string
					project_id: string
					type: string
				}
				Relationships: [
					{
						columns: ['project_id']
						foreignKeyName: 'api_keys_project_id_fkey'
						isOneToOne: false
						referencedColumns: ['project_id']
						referencedRelation: 'active_entitlements'
					},
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
					created_at: string
					environment: string
					id: string
					key_hash: string
					key_value: null | string
					last_used_at: null | string
					name: null | string
					project_id: string
					type: string
				}
				Update: {
					allowed_domains?: null | string[]
					created_at?: string
					environment?: string
					id?: string
					key_hash?: string
					key_value?: null | string
					last_used_at?: null | string
					name?: null | string
					project_id?: string
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
			entitlements: {
				Insert: {
					created_at?: string
					ends_at?: null | string
					features: string[]
					id?: string
					log_retention_days: number
					project_id?: null | string
					source: string
					starts_at?: null | string
					team_limit?: number
					updated_at?: string
					validations_limit: number
				}
				Relationships: [
					{
						columns: ['project_id']
						foreignKeyName: 'entitlements_project_id_fkey'
						isOneToOne: false
						referencedColumns: ['project_id']
						referencedRelation: 'active_entitlements'
					},
					{
						columns: ['project_id']
						foreignKeyName: 'entitlements_project_id_fkey'
						isOneToOne: false
						referencedColumns: ['id']
						referencedRelation: 'projects'
					}
				]
				Row: {
					created_at: string
					ends_at: null | string
					features: string[]
					id: string
					log_retention_days: number
					project_id: null | string
					source: string
					starts_at: null | string
					team_limit: number
					updated_at: string
					validations_limit: number
				}
				Update: {
					created_at?: string
					ends_at?: null | string
					features?: string[]
					id?: string
					log_retention_days?: number
					project_id?: null | string
					source?: string
					starts_at?: null | string
					team_limit?: number
					updated_at?: string
					validations_limit?: number
				}
			}
			project_members: {
				Insert: {
					accepted_at?: null | string
					created_at?: string
					project_id: string
					role: string
					updated_at?: string
					user_id: string
				}
				Relationships: [
					{
						columns: ['project_id']
						foreignKeyName: 'project_members_project_id_fkey'
						isOneToOne: false
						referencedColumns: ['project_id']
						referencedRelation: 'active_entitlements'
					},
					{
						columns: ['project_id']
						foreignKeyName: 'project_members_project_id_fkey'
						isOneToOne: false
						referencedColumns: ['id']
						referencedRelation: 'projects'
					},
					{
						columns: ['user_id']
						foreignKeyName: 'project_members_user_id_fkey'
						isOneToOne: false
						referencedColumns: ['id']
						referencedRelation: 'users'
					}
				]
				Row: {
					accepted_at: null | string
					created_at: string
					project_id: string
					role: string
					updated_at: string
					user_id: string
				}
				Update: {
					accepted_at?: null | string
					created_at?: string
					project_id?: string
					role?: string
					updated_at?: string
					user_id?: string
				}
			}
			projects: {
				Insert: {
					created_at?: string
					deleted_at?: null | string
					id?: string
					name: string
					owner_id: string
					settings?: Json
					slug: string
					stripe_customer_id?: null | string
					updated_at?: string
				}
				Relationships: []
				Row: {
					created_at: string
					deleted_at: null | string
					id: string
					name: string
					owner_id: string
					settings: Json
					slug: string
					stripe_customer_id: null | string
					updated_at: string
				}
				Update: {
					created_at?: string
					deleted_at?: null | string
					id?: string
					name?: string
					owner_id?: string
					settings?: Json
					slug?: string
					stripe_customer_id?: null | string
					updated_at?: string
				}
			}
			stripe_prices: {
				Insert: {
					active?: boolean
					created_at?: string
					currency: string
					deleted_at?: null | string
					id: string
					lookup_key: string
					metadata?: Json | null
					nickname?: null | string
					product_id: string
					recurring_interval?: null | string
					recurring_interval_count?: null | number
					type: string
					unit_amount?: null | number
					updated_at?: string
				}
				Relationships: [
					{
						columns: ['product_id']
						foreignKeyName: 'stripe_prices_product_id_fkey'
						isOneToOne: false
						referencedColumns: ['id']
						referencedRelation: 'stripe_products'
					}
				]
				Row: {
					active: boolean
					created_at: string
					currency: string
					deleted_at: null | string
					id: string
					lookup_key: string
					metadata: Json | null
					nickname: null | string
					product_id: string
					recurring_interval: null | string
					recurring_interval_count: null | number
					type: string
					unit_amount: null | number
					updated_at: string
				}
				Update: {
					active?: boolean
					created_at?: string
					currency?: string
					deleted_at?: null | string
					id?: string
					lookup_key?: string
					metadata?: Json | null
					nickname?: null | string
					product_id?: string
					recurring_interval?: null | string
					recurring_interval_count?: null | number
					type?: string
					unit_amount?: null | number
					updated_at?: string
				}
			}
			stripe_products: {
				Insert: {
					active?: boolean
					created_at?: string
					deleted_at?: null | string
					description?: null | string
					entitlements?: Json | null
					id: string
					marketing_features?: null | string[]
					metadata?: Json | null
					name: string
					updated_at?: string
				}
				Relationships: []
				Row: {
					active: boolean
					created_at: string
					deleted_at: null | string
					description: null | string
					entitlements: Json | null
					id: string
					marketing_features: null | string[]
					metadata: Json | null
					name: string
					updated_at: string
				}
				Update: {
					active?: boolean
					created_at?: string
					deleted_at?: null | string
					description?: null | string
					entitlements?: Json | null
					id?: string
					marketing_features?: null | string[]
					metadata?: Json | null
					name?: string
					updated_at?: string
				}
			}
			stripe_subscriptions: {
				Insert: {
					amount: number
					cancel_at?: null | string
					cancel_at_period_end?: boolean
					canceled_at?: null | string
					created_at?: string
					currency: string
					current_period_end?: null | string
					current_period_start?: null | string
					deleted_at?: null | string
					entitlement_id?: null | string
					id: string
					interval?: null | string
					interval_count?: null | number
					price_id?: null | string
					product_id?: null | string
					product_name?: null | string
					project_id?: null | string
					status: string
					trial_end?: null | string
					trial_start?: null | string
					updated_at?: string
				}
				Relationships: [
					{
						columns: ['entitlement_id']
						foreignKeyName: 'stripe_subscriptions_entitlement_id_fkey'
						isOneToOne: false
						referencedColumns: ['id']
						referencedRelation: 'entitlements'
					},
					{
						columns: ['price_id']
						foreignKeyName: 'stripe_subscriptions_price_id_fkey'
						isOneToOne: false
						referencedColumns: ['id']
						referencedRelation: 'stripe_prices'
					},
					{
						columns: ['project_id']
						foreignKeyName: 'stripe_subscriptions_project_id_fkey'
						isOneToOne: false
						referencedColumns: ['project_id']
						referencedRelation: 'active_entitlements'
					},
					{
						columns: ['project_id']
						foreignKeyName: 'stripe_subscriptions_project_id_fkey'
						isOneToOne: false
						referencedColumns: ['id']
						referencedRelation: 'projects'
					}
				]
				Row: {
					amount: number
					cancel_at: null | string
					cancel_at_period_end: boolean
					canceled_at: null | string
					created_at: string
					currency: string
					current_period_end: null | string
					current_period_start: null | string
					deleted_at: null | string
					entitlement_id: null | string
					id: string
					interval: null | string
					interval_count: null | number
					price_id: null | string
					product_id: null | string
					product_name: null | string
					project_id: null | string
					status: string
					trial_end: null | string
					trial_start: null | string
					updated_at: string
				}
				Update: {
					amount?: number
					cancel_at?: null | string
					cancel_at_period_end?: boolean
					canceled_at?: null | string
					created_at?: string
					currency?: string
					current_period_end?: null | string
					current_period_start?: null | string
					deleted_at?: null | string
					entitlement_id?: null | string
					id?: string
					interval?: null | string
					interval_count?: null | number
					price_id?: null | string
					product_id?: null | string
					product_name?: null | string
					project_id?: null | string
					status?: string
					trial_end?: null | string
					trial_start?: null | string
					updated_at?: string
				}
			}
			usage: {
				Insert: {
					count?: number
					id?: string
					limit_exceeded_at?: null | string
					month: string
					project_id?: null | string
					updated_at?: string
				}
				Relationships: [
					{
						columns: ['project_id']
						foreignKeyName: 'usage_project_id_fkey'
						isOneToOne: false
						referencedColumns: ['project_id']
						referencedRelation: 'active_entitlements'
					},
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
					updated_at: string
				}
				Update: {
					count?: number
					id?: string
					limit_exceeded_at?: null | string
					month?: string
					project_id?: null | string
					updated_at?: string
				}
			}
			users: {
				Insert: {
					avatar_url?: null | string
					created_at?: string
					deleted_at?: null | string
					email: string
					id: string
					is_superadmin?: boolean
					name?: null | string
					updated_at?: string
				}
				Relationships: []
				Row: {
					avatar_url: null | string
					created_at: string
					deleted_at: null | string
					email: string
					id: string
					is_superadmin: boolean
					name: null | string
					updated_at: string
				}
				Update: {
					avatar_url?: null | string
					created_at?: string
					deleted_at?: null | string
					email?: string
					id?: string
					is_superadmin?: boolean
					name?: null | string
					updated_at?: string
				}
			}
			validation_logs: {
				Insert: {
					checks: Json
					created_at?: string
					email_encrypted: string
					email_hash: string
					fingerprint_id?: null | string
					id?: string
					ip_address?: unknown
					latency_ms?: null | number
					project_id?: null | string
					recommendation: string
					signals?: string[]
				}
				Relationships: [
					{
						columns: ['project_id']
						foreignKeyName: 'validation_logs_project_id_fkey'
						isOneToOne: false
						referencedColumns: ['project_id']
						referencedRelation: 'active_entitlements'
					},
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
					created_at: string
					email_encrypted: string
					email_hash: string
					fingerprint_id: null | string
					id: string
					ip_address: unknown
					latency_ms: null | number
					project_id: null | string
					recommendation: string
					signals: string[]
				}
				Update: {
					checks?: Json
					created_at?: string
					email_encrypted?: string
					email_hash?: string
					fingerprint_id?: null | string
					id?: string
					ip_address?: unknown
					latency_ms?: null | number
					project_id?: null | string
					recommendation?: string
					signals?: string[]
				}
			}
		}
		Views: {
			active_entitlements: {
				Relationships: []
				Row: {
					features: null | string[]
					first_entitlement_start: null | string
					is_active: boolean | null
					last_refreshed: null | string
					latest_entitlement_end: null | string
					log_retention_days: null | number
					owner_id: null | string
					project_id: null | string
					project_name: null | string
					project_slug: null | string
					sources: null | string[]
					subscription_info: Json | null
					team_limit: null | number
					validations_limit: null | number
				}
			}
			validation_logs_daily: {
				Relationships: [
					{
						columns: ['project_id']
						foreignKeyName: 'validation_logs_project_id_fkey'
						isOneToOne: false
						referencedColumns: ['project_id']
						referencedRelation: 'active_entitlements'
					},
					{
						columns: ['project_id']
						foreignKeyName: 'validation_logs_project_id_fkey'
						isOneToOne: false
						referencedColumns: ['id']
						referencedRelation: 'projects'
					}
				]
				Row: {
					allowed: null | number
					avg_latency_ms: null | number
					blocked: null | number
					count: null | number
					date: null | string
					first_validation: null | string
					flagged: null | number
					last_refreshed: null | string
					last_validation: null | string
					project_id: null | string
				}
			}
		}
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
