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
					created_at: string
					environment: string
					id: string
					key_hash: string
					last_used_at: string | null
					name: string | null
					project_id: string
					revoked_at: string | null
					type: string
				}
				Insert: {
					created_at?: string
					environment: string
					id?: string
					key_hash: string
					last_used_at?: string | null
					name?: string | null
					project_id: string
					revoked_at?: string | null
					type: string
				}
				Update: {
					created_at?: string
					environment?: string
					id?: string
					key_hash?: string
					last_used_at?: string | null
					name?: string | null
					project_id?: string
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
			entitlements: {
				Row: {
					created_at: string
					ends_at: string | null
					features: string[]
					id: string
					log_retention_days: number
					organization_id: string
					source: string
					starts_at: string | null
					updated_at: string
					validations_limit: number
				}
				Insert: {
					created_at?: string
					ends_at?: string | null
					features: string[]
					id?: string
					log_retention_days: number
					organization_id: string
					source: string
					starts_at?: string | null
					updated_at?: string
					validations_limit: number
				}
				Update: {
					created_at?: string
					ends_at?: string | null
					features?: string[]
					id?: string
					log_retention_days?: number
					organization_id?: string
					source?: string
					starts_at?: string | null
					updated_at?: string
					validations_limit?: number
				}
				Relationships: [
					{
						foreignKeyName: 'entitlements_organization_id_fkey'
						columns: ['organization_id']
						isOneToOne: false
						referencedRelation: 'active_entitlement_summary'
						referencedColumns: ['organization_id']
					},
					{
						foreignKeyName: 'entitlements_organization_id_fkey'
						columns: ['organization_id']
						isOneToOne: false
						referencedRelation: 'organizations'
						referencedColumns: ['id']
					}
				]
			}
			organization_members: {
				Row: {
					created_at: string
					organization_id: string
					role: string
					updated_at: string
					user_id: string
				}
				Insert: {
					created_at?: string
					organization_id: string
					role: string
					updated_at?: string
					user_id: string
				}
				Update: {
					created_at?: string
					organization_id?: string
					role?: string
					updated_at?: string
					user_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'organization_members_organization_id_fkey'
						columns: ['organization_id']
						isOneToOne: false
						referencedRelation: 'active_entitlement_summary'
						referencedColumns: ['organization_id']
					},
					{
						foreignKeyName: 'organization_members_organization_id_fkey'
						columns: ['organization_id']
						isOneToOne: false
						referencedRelation: 'organizations'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'organization_members_user_id_fkey'
						columns: ['user_id']
						isOneToOne: false
						referencedRelation: 'users'
						referencedColumns: ['id']
					}
				]
			}
			organizations: {
				Row: {
					billing_address: Json | null
					billing_email: string | null
					created_at: string
					deleted_at: string | null
					id: string
					name: string
					owner_id: string
					updated_at: string
				}
				Insert: {
					billing_address?: Json | null
					billing_email?: string | null
					created_at?: string
					deleted_at?: string | null
					id: string
					name: string
					owner_id: string
					updated_at?: string
				}
				Update: {
					billing_address?: Json | null
					billing_email?: string | null
					created_at?: string
					deleted_at?: string | null
					id?: string
					name?: string
					owner_id?: string
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'organizations_owner_id_fkey'
						columns: ['owner_id']
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
					organization_id: string
					settings: Json
					updated_at: string
				}
				Insert: {
					created_at?: string
					deleted_at?: string | null
					id: string
					name: string
					organization_id: string
					settings?: Json
					updated_at?: string
				}
				Update: {
					created_at?: string
					deleted_at?: string | null
					id?: string
					name?: string
					organization_id?: string
					settings?: Json
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'projects_organization_id_fkey'
						columns: ['organization_id']
						isOneToOne: false
						referencedRelation: 'active_entitlement_summary'
						referencedColumns: ['organization_id']
					},
					{
						foreignKeyName: 'projects_organization_id_fkey'
						columns: ['organization_id']
						isOneToOne: false
						referencedRelation: 'organizations'
						referencedColumns: ['id']
					}
				]
			}
			stripe_customers: {
				Row: {
					created_at: string
					email: string | null
					id: string
					organization_id: string
					updated_at: string
				}
				Insert: {
					created_at?: string
					email?: string | null
					id: string
					organization_id: string
					updated_at?: string
				}
				Update: {
					created_at?: string
					email?: string | null
					id?: string
					organization_id?: string
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'stripe_customers_organization_id_fkey'
						columns: ['organization_id']
						isOneToOne: true
						referencedRelation: 'active_entitlement_summary'
						referencedColumns: ['organization_id']
					},
					{
						foreignKeyName: 'stripe_customers_organization_id_fkey'
						columns: ['organization_id']
						isOneToOne: true
						referencedRelation: 'organizations'
						referencedColumns: ['id']
					}
				]
			}
			stripe_payment_methods: {
				Row: {
					billing_details: Json | null
					card_brand: string | null
					card_last4: string | null
					created_at: string
					detached_at: string | null
					exp_month: number | null
					exp_year: number | null
					id: string
					is_default: boolean
					stripe_customer_id: string
					type: string | null
					updated_at: string
				}
				Insert: {
					billing_details?: Json | null
					card_brand?: string | null
					card_last4?: string | null
					created_at?: string
					detached_at?: string | null
					exp_month?: number | null
					exp_year?: number | null
					id: string
					is_default?: boolean
					stripe_customer_id: string
					type?: string | null
					updated_at?: string
				}
				Update: {
					billing_details?: Json | null
					card_brand?: string | null
					card_last4?: string | null
					created_at?: string
					detached_at?: string | null
					exp_month?: number | null
					exp_year?: number | null
					id?: string
					is_default?: boolean
					stripe_customer_id?: string
					type?: string | null
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'stripe_payment_methods_stripe_customer_id_fkey'
						columns: ['stripe_customer_id']
						isOneToOne: false
						referencedRelation: 'stripe_customers'
						referencedColumns: ['id']
					}
				]
			}
			stripe_prices: {
				Row: {
					active: boolean
					created_at: string
					currency: string
					deleted_at: string | null
					id: string
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
					metadata?: Json | null
					name?: string
					updated_at?: string
				}
				Relationships: []
			}
			stripe_subscriptions: {
				Row: {
					cancel_at_period_end: boolean
					canceled_at: string | null
					created_at: string
					current_period_end: string | null
					current_period_start: string | null
					entitlement_id: string | null
					id: string
					organization_id: string
					price_id: string
					status: string
					stripe_customer_id: string
					trial_end: string | null
					trial_start: string | null
					updated_at: string
				}
				Insert: {
					cancel_at_period_end?: boolean
					canceled_at?: string | null
					created_at?: string
					current_period_end?: string | null
					current_period_start?: string | null
					entitlement_id?: string | null
					id: string
					organization_id: string
					price_id: string
					status: string
					stripe_customer_id: string
					trial_end?: string | null
					trial_start?: string | null
					updated_at?: string
				}
				Update: {
					cancel_at_period_end?: boolean
					canceled_at?: string | null
					created_at?: string
					current_period_end?: string | null
					current_period_start?: string | null
					entitlement_id?: string | null
					id?: string
					organization_id?: string
					price_id?: string
					status?: string
					stripe_customer_id?: string
					trial_end?: string | null
					trial_start?: string | null
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'fk_stripe_subscriptions_price'
						columns: ['price_id']
						isOneToOne: false
						referencedRelation: 'stripe_prices'
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
						foreignKeyName: 'stripe_subscriptions_organization_id_fkey'
						columns: ['organization_id']
						isOneToOne: false
						referencedRelation: 'active_entitlement_summary'
						referencedColumns: ['organization_id']
					},
					{
						foreignKeyName: 'stripe_subscriptions_organization_id_fkey'
						columns: ['organization_id']
						isOneToOne: false
						referencedRelation: 'organizations'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'stripe_subscriptions_stripe_customer_id_fkey'
						columns: ['stripe_customer_id']
						isOneToOne: false
						referencedRelation: 'stripe_customers'
						referencedColumns: ['id']
					}
				]
			}
			stripe_transactions: {
				Row: {
					amount: number
					created_at: string
					currency: string
					description: string | null
					id: string
					metadata: Json | null
					organization_id: string
					processed_at: string
					status: string
					type: string
				}
				Insert: {
					amount: number
					created_at?: string
					currency: string
					description?: string | null
					id: string
					metadata?: Json | null
					organization_id: string
					processed_at: string
					status: string
					type: string
				}
				Update: {
					amount?: number
					created_at?: string
					currency?: string
					description?: string | null
					id?: string
					metadata?: Json | null
					organization_id?: string
					processed_at?: string
					status?: string
					type?: string
				}
				Relationships: [
					{
						foreignKeyName: 'stripe_transactions_organization_id_fkey'
						columns: ['organization_id']
						isOneToOne: false
						referencedRelation: 'active_entitlement_summary'
						referencedColumns: ['organization_id']
					},
					{
						foreignKeyName: 'stripe_transactions_organization_id_fkey'
						columns: ['organization_id']
						isOneToOne: false
						referencedRelation: 'organizations'
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
					project_id: string
					updated_at: string
				}
				Insert: {
					count?: number
					id?: string
					limit_exceeded_at?: string | null
					month: string
					project_id: string
					updated_at?: string
				}
				Update: {
					count?: number
					id?: string
					limit_exceeded_at?: string | null
					month?: string
					project_id?: string
					updated_at?: string
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
					created_at: string
					email_encrypted: string
					email_hash: string
					fingerprint_id: string | null
					id: string
					ip_address: unknown
					is_valid: boolean
					latency_ms: number | null
					project_id: string
					recommendation: string
					risk_score: number
					signals: string[]
				}
				Insert: {
					checks: Json
					created_at?: string
					email_encrypted: string
					email_hash: string
					fingerprint_id?: string | null
					id?: string
					ip_address?: unknown
					is_valid: boolean
					latency_ms?: number | null
					project_id: string
					recommendation: string
					risk_score: number
					signals?: string[]
				}
				Update: {
					checks?: Json
					created_at?: string
					email_encrypted?: string
					email_hash?: string
					fingerprint_id?: string | null
					id?: string
					ip_address?: unknown
					is_valid?: boolean
					latency_ms?: number | null
					project_id?: string
					recommendation?: string
					risk_score?: number
					signals?: string[]
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
			active_entitlement_summary: {
				Row: {
					features: string[] | null
					first_entitlement_start: string | null
					is_active: boolean | null
					last_refreshed: string | null
					latest_entitlement_end: string | null
					log_retention_days: number | null
					organization_id: string | null
					organization_name: string | null
					sources: string[] | null
					subscription_info: Json | null
					validations_limit: number | null
				}
				Relationships: []
			}
		}
		Functions: {
			is_org_admin: { Args: { org_id: string }; Returns: boolean }
			is_org_member: { Args: { org_id: string }; Returns: boolean }
			is_org_owner: { Args: { org_id: string }; Returns: boolean }
			is_superadmin: { Args: never; Returns: boolean }
			user_organizations: { Args: never; Returns: string[] }
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
