import { useQuery } from '@tanstack/react-query'
import { getPermissionMatrix } from '@/api/permissions'
import { useAuthStore } from '@/store/authStore'
import type { PermissionFeature, PermissionLevel } from '@/types/enums'

const LEVEL_RANK: Record<PermissionLevel, number> = { none: 0, view: 1, full: 2 }

export function usePermissionMatrix() {
  const user = useAuthStore((s) => s.user)
  return useQuery({
    queryKey: ['permissions', 'matrix'],
    queryFn: getPermissionMatrix,
    enabled: !!user && user.role === 'super_admin',
    staleTime: 60 * 1000,
  })
}

/**
 * Client-side gating mirrors the server's require_permission dependency: admin is
 * always full, other roles fall back to the seeded defaults until the matrix loads.
 */
const DEFAULT_MATRIX: Record<PermissionFeature, Record<'vendor' | 'driver', PermissionLevel>> = {
  orders: { vendor: 'full', driver: 'none' },
  delivery: { vendor: 'none', driver: 'full' },
  crates: { vendor: 'none', driver: 'none' },
  products: { vendor: 'none', driver: 'none' },
  vendors: { vendor: 'none', driver: 'none' },
  billing: { vendor: 'none', driver: 'none' },
  payments: { vendor: 'none', driver: 'none' },
  user_access: { vendor: 'none', driver: 'none' },
  reports: { vendor: 'none', driver: 'none' },
  purchases: { vendor: 'none', driver: 'none' },
  sales: { vendor: 'none', driver: 'none' },
  expenses: { vendor: 'none', driver: 'none' },
  e_invoicing: { vendor: 'none', driver: 'none' },
  business_partners: { vendor: 'none', driver: 'none' },
  transport: { vendor: 'none', driver: 'none' },
  loans: { vendor: 'none', driver: 'none' },
}

export function usePermission(feature: PermissionFeature) {
  const user = useAuthStore((s) => s.user)
  const { data: matrix } = useQuery({
    queryKey: ['permissions', 'matrix'],
    queryFn: getPermissionMatrix,
    enabled: !!user && user.role !== 'super_admin',
    staleTime: 60 * 1000,
  })

  if (!user) return { level: 'none' as PermissionLevel, can: () => false }
  if (user.role === 'super_admin') return { level: 'full' as PermissionLevel, can: () => true }

  const role = user.role as 'vendor' | 'driver'
  const entry = matrix?.find((p) => p.feature === feature && p.role === role)
  let level = entry?.level ?? DEFAULT_MATRIX[feature][role]

  // Vendors can always view their own deliveries and confirm receipt — the backend scopes
  // this to order ownership rather than the admin-configurable dispatch-board permission
  // (see the comment on the delivery routes), so the nav/route gate shouldn't hide it.
  if (feature === 'delivery' && role === 'vendor' && LEVEL_RANK[level] < LEVEL_RANK.view) {
    level = 'view'
  }

  return {
    level,
    can: (min: PermissionLevel) => LEVEL_RANK[level] >= LEVEL_RANK[min],
  }
}

/**
 * Resolves "can view" for any feature without one hook call per nav item, so the
 * sidebar can group items by category and hide sections that end up empty.
 */
export function useCanViewFeature() {
  const user = useAuthStore((s) => s.user)
  const { data: matrix } = useQuery({
    queryKey: ['permissions', 'matrix'],
    queryFn: getPermissionMatrix,
    enabled: !!user && user.role !== 'super_admin',
    staleTime: 60 * 1000,
  })

  return (feature: PermissionFeature | 'dashboard') => {
    if (!user) return false
    if (feature === 'dashboard' || user.role === 'super_admin') return true

    const role = user.role as 'vendor' | 'driver'
    const entry = matrix?.find((p) => p.feature === feature && p.role === role)
    let level = entry?.level ?? DEFAULT_MATRIX[feature][role]

    if (feature === 'delivery' && role === 'vendor' && LEVEL_RANK[level] < LEVEL_RANK.view) {
      level = 'view'
    }

    return LEVEL_RANK[level] >= LEVEL_RANK.view
  }
}
