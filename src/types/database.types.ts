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
					created_at: string
					environment: string
					id: string
					key_hash: string
					key_value: string | null
					last_used_at: string | null
					name: string | null
					project_id: string
					type: string
				}
				Insert: {
					allowed_domains?: string[] | null
					created_at?: string
					environment: string
					id?: string
					key_hash: string
					key_value?: string | null
					last_used_at?: string | null
					name?: string | null
					project_id: string
					type: string
				}
				Update: {
					allowed_domains?: string[] | null
					created_at?: string
					environment?: string
					id?: string
					key_hash?: string
					key_value?: string | null
					last_used_at?: string | null
					name?: string | null
					project_id?: string
					type?: string
				}
				Relationships: [
					{
						foreignKeyName: 'api_keys_project_id_fkey'
						columns: ['project_id']
						isOneToOne: false
						referencedRelation: 'active_entitlements'
						referencedColumns: ['project_id']
					},
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
			entitlements: {
				Row: {
					created_at: string
					ends_at: string | null
					features: string[]
					id: string
					log_retention_days: number
					project_id: string | null
					source: string
					starts_at: string | null
					team_limit: number
					updated_at: string
					validations_limit: number
				}
				Insert: {
					created_at?: string
					ends_at?: string | null
					features: string[]
					id?: string
					log_retention_days: number
					project_id?: string | null
					source: string
					starts_at?: string | null
					team_limit?: number
					updated_at?: string
					validations_limit: number
				}
				Update: {
					created_at?: string
					ends_at?: string | null
					features?: string[]
					id?: string
					log_retention_days?: number
					project_id?: string | null
					source?: string
					starts_at?: string | null
					team_limit?: number
					updated_at?: string
					validations_limit?: number
				}
				Relationships: [
					{
						foreignKeyName: 'entitlements_project_id_fkey'
						columns: ['project_id']
						isOneToOne: false
						referencedRelation: 'active_entitlements'
						referencedColumns: ['project_id']
					},
					{
						foreignKeyName: 'entitlements_project_id_fkey'
						columns: ['project_id']
						isOneToOne: false
						referencedRelation: 'projects'
						referencedColumns: ['id']
					}
				]
			}
			project_members: {
				Row: {
					accepted_at: string | null
					created_at: string
					project_id: string
					role: string
					updated_at: string
					user_id: string
				}
				Insert: {
					accepted_at?: string | null
					created_at?: string
					project_id: string
					role: string
					updated_at?: string
					user_id: string
				}
				Update: {
					accepted_at?: string | null
					created_at?: string
					project_id?: string
					role?: string
					updated_at?: string
					user_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'project_members_project_id_fkey'
						columns: ['project_id']
						isOneToOne: false
						referencedRelation: 'active_entitlements'
						referencedColumns: ['project_id']
					},
					{
						foreignKeyName: 'project_members_project_id_fkey'
						columns: ['project_id']
						isOneToOne: false
						referencedRelation: 'projects'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'project_members_user_id_fkey'
						columns: ['user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					}
				]
			}
			projects: {
				Row: {
					created_at: string
					deleted_at: string | null
					id: string
					name: string
					owner_id: string
					settings: Json
					slug: string
					stripe_customer_id: string | null
					updated_at: string
				}
				Insert: {
					created_at?: string
					deleted_at?: string | null
					id?: string
					name: string
					owner_id: string
					settings?: Json
					slug: string
					stripe_customer_id?: string | null
					updated_at?: string
				}
				Update: {
					created_at?: string
					deleted_at?: string | null
					id?: string
					name?: string
					owner_id?: string
					settings?: Json
					slug?: string
					stripe_customer_id?: string | null
					updated_at?: string
				}
				Relationships: []
			}
			stripe_coupons: {
				Row: {
					amount_off: number | null
					applies_to_product_ids: string[] | null
					created_at: string
					currency: string | null
					deleted_at: string | null
					duration: string
					duration_in_months: number | null
					id: string
					max_redemptions: number | null
					metadata: Json | null
					name: string | null
					percent_off: number | null
					redeem_by: string | null
					times_redeemed: number | null
					updated_at: string
					valid: boolean
				}
				Insert: {
					amount_off?: number | null
					applies_to_product_ids?: string[] | null
					created_at?: string
					currency?: string | null
					deleted_at?: string | null
					duration: string
					duration_in_months?: number | null
					id: string
					max_redemptions?: number | null
					metadata?: Json | null
					name?: string | null
					percent_off?: number | null
					redeem_by?: string | null
					times_redeemed?: number | null
					updated_at?: string
					valid?: boolean
				}
				Update: {
					amount_off?: number | null
					applies_to_product_ids?: string[] | null
					created_at?: string
					currency?: string | null
					deleted_at?: string | null
					duration?: string
					duration_in_months?: number | null
					id?: string
					max_redemptions?: number | null
					metadata?: Json | null
					name?: string | null
					percent_off?: number | null
					redeem_by?: string | null
					times_redeemed?: number | null
					updated_at?: string
					valid?: boolean
				}
				Relationships: []
			}
			stripe_prices: {
				Row: {
					active: boolean
					created_at: string
					currency: string
					deleted_at: string | null
					id: string
					lookup_key: string
					metadata: Json | null
					nickname: string | null
					product_id: string
					recurring_interval: string | null
					recurring_interval_count: number | null
					type: string
					unit_amount: number | null
					updated_at: string
				}
				Insert: {
					active?: boolean
					created_at?: string
					currency: string
					deleted_at?: string | null
					id: string
					lookup_key: string
					metadata?: Json | null
					nickname?: string | null
					product_id: string
					recurring_interval?: string | null
					recurring_interval_count?: number | null
					type: string
					unit_amount?: number | null
					updated_at?: string
				}
				Update: {
					active?: boolean
					created_at?: string
					currency?: string
					deleted_at?: string | null
					id?: string
					lookup_key?: string
					metadata?: Json | null
					nickname?: string | null
					product_id?: string
					recurring_interval?: string | null
					recurring_interval_count?: number | null
					type?: string
					unit_amount?: number | null
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'stripe_prices_product_id_fkey'
						columns: ['product_id']
						isOneToOne: false
						referencedRelation: 'stripe_products'
						referencedColumns: ['id']
					}
				]
			}
			stripe_products: {
				Row: {
					active: boolean
					created_at: string
					deleted_at: string | null
					description: string | null
					entitlements: Json | null
					id: string
					marketing_features: string[] | null
					metadata: Json | null
					name: string
					updated_at: string
				}
				Insert: {
					active?: boolean
					created_at?: string
					deleted_at?: string | null
					description?: string | null
					entitlements?: Json | null
					id: string
					marketing_features?: string[] | null
					metadata?: Json | null
					name: string
					updated_at?: string
				}
				Update: {
					active?: boolean
					created_at?: string
					deleted_at?: string | null
					description?: string | null
					entitlements?: Json | null
					id?: string
					marketing_features?: string[] | null
					metadata?: Json | null
					name?: string
					updated_at?: string
				}
				Relationships: []
			}
			stripe_subscriptions: {
				Row: {
					amount: number
					cancel_at: string | null
					cancel_at_period_end: boolean
					canceled_at: string | null
					created_at: string
					currency: string
					current_period_end: string | null
					current_period_start: string | null
					deleted_at: string | null
					discount_coupon_id: string | null
					discount_end: string | null
					discount_start: string | null
					entitlement_id: string | null
					id: string
					interval: string | null
					interval_count: number | null
					price_id: string | null
					product_id: string | null
					product_name: string | null
					project_id: string | null
					status: string
					trial_end: string | null
					trial_start: string | null
					updated_at: string
				}
				Insert: {
					amount: number
					cancel_at?: string | null
					cancel_at_period_end?: boolean
					canceled_at?: string | null
					created_at?: string
					currency: string
					current_period_end?: string | null
					current_period_start?: string | null
					deleted_at?: string | null
					discount_coupon_id?: string | null
					discount_end?: string | null
					discount_start?: string | null
					entitlement_id?: string | null
					id: string
					interval?: string | null
					interval_count?: number | null
					price_id?: string | null
					product_id?: string | null
					product_name?: string | null
					project_id?: string | null
					status: string
					trial_end?: string | null
					trial_start?: string | null
					updated_at?: string
				}
				Update: {
					amount?: number
					cancel_at?: string | null
					cancel_at_period_end?: boolean
					canceled_at?: string | null
					created_at?: string
					currency?: string
					current_period_end?: string | null
					current_period_start?: string | null
					deleted_at?: string | null
					discount_coupon_id?: string | null
					discount_end?: string | null
					discount_start?: string | null
					entitlement_id?: string | null
					id?: string
					interval?: string | null
					interval_count?: number | null
					price_id?: string | null
					product_id?: string | null
					product_name?: string | null
					project_id?: string | null
					status?: string
					trial_end?: string | null
					trial_start?: string | null
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'stripe_subscriptions_discount_coupon_id_fkey'
						columns: ['discount_coupon_id']
						isOneToOne: false
						referencedRelation: 'stripe_coupons'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'stripe_subscriptions_entitlement_id_fkey'
						columns: ['entitlement_id']
						isOneToOne: false
						referencedRelation: 'entitlements'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'stripe_subscriptions_price_id_fkey'
						columns: ['price_id']
						isOneToOne: false
						referencedRelation: 'stripe_prices'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'stripe_subscriptions_project_id_fkey'
						columns: ['project_id']
						isOneToOne: false
						referencedRelation: 'active_entitlements'
						referencedColumns: ['project_id']
					},
					{
						foreignKeyName: 'stripe_subscriptions_project_id_fkey'
						columns: ['project_id']
						isOneToOne: false
						referencedRelation: 'projects'
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
					updated_at: string
				}
				Insert: {
					count?: number
					id?: string
					limit_exceeded_at?: string | null
					month: string
					project_id?: string | null
					updated_at?: string
				}
				Update: {
					count?: number
					id?: string
					limit_exceeded_at?: string | null
					month?: string
					project_id?: string | null
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'usage_project_id_fkey'
						columns: ['project_id']
						isOneToOne: false
						referencedRelation: 'active_entitlements'
						referencedColumns: ['project_id']
					},
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
					avatar_url: string | null
					created_at: string
					deleted_at: string | null
					email: string
					id: string
					is_superadmin: boolean
					name: string | null
					updated_at: string
				}
				Insert: {
					avatar_url?: string | null
					created_at?: string
					deleted_at?: string | null
					email: string
					id: string
					is_superadmin?: boolean
					name?: string | null
					updated_at?: string
				}
				Update: {
					avatar_url?: string | null
					created_at?: string
					deleted_at?: string | null
					email?: string
					id?: string
					is_superadmin?: boolean
					name?: string | null
					updated_at?: string
				}
				Relationships: []
			}
			validation_logs: {
				Row: {
					checks: Json
					country: string | null
					created_at: string
					device_type: string | null
					email_encrypted: string
					email_hash: string
					fingerprint_id: string | null
					id: string
					ip_address: unknown
					latency_ms: number | null
					project_id: string | null
					recommendation: string
					sdk_version: string | null
					signals: string[]
				}
				Insert: {
					checks: Json
					country?: string | null
					created_at?: string
					device_type?: string | null
					email_encrypted: string
					email_hash: string
					fingerprint_id?: string | null
					id?: string
					ip_address?: unknown
					latency_ms?: number | null
					project_id?: string | null
					recommendation: string
					sdk_version?: string | null
					signals?: string[]
				}
				Update: {
					checks?: Json
					country?: string | null
					created_at?: string
					device_type?: string | null
					email_encrypted?: string
					email_hash?: string
					fingerprint_id?: string | null
					id?: string
					ip_address?: unknown
					latency_ms?: number | null
					project_id?: string | null
					recommendation?: string
					sdk_version?: string | null
					signals?: string[]
				}
				Relationships: [
					{
						foreignKeyName: 'validation_logs_project_id_fkey'
						columns: ['project_id']
						isOneToOne: false
						referencedRelation: 'active_entitlements'
						referencedColumns: ['project_id']
					},
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
			active_entitlements: {
				Row: {
					features: string[] | null
					first_entitlement_start: string | null
					is_active: boolean | null
					last_refreshed: string | null
					latest_entitlement_end: string | null
					log_retention_days: number | null
					owner_id: string | null
					project_id: string | null
					project_name: string | null
					project_slug: string | null
					sources: string[] | null
					subscription_info: Json | null
					team_limit: number | null
					validations_limit: number | null
				}
				Relationships: []
			}
			validation_logs_daily: {
				Row: {
					allowed: number | null
					avg_latency_ms: number | null
					blocked: number | null
					count: number | null
					date: string | null
					first_validation: string | null
					flagged: number | null
					last_refreshed: string | null
					last_validation: string | null
					project_id: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'validation_logs_project_id_fkey'
						columns: ['project_id']
						isOneToOne: false
						referencedRelation: 'active_entitlements'
						referencedColumns: ['project_id']
					},
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
		Functions: {
			can_manage_project: {
				Args: { project_id_param: string }
				Returns: boolean
			}
			check_slug_availability: {
				Args: { slug_param: string }
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

export const Constants = {
	public: {
		Enums: {}
	}
} as const
