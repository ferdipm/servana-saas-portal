# SaaS Portal - Multi-Restaurant Migration TODO

## Overview

The portal needs to be updated to work with the new multi-restaurant schema. This document outlines all required changes.

## Required Changes

### 1. Update Database Queries

#### File: `app/page.tsx` (Main Reservations Page)

**Current:**
```typescript
const { data: reservations } = await supabase
  .from('reservations')
  .select('*')
  .eq('tenant_id', user.tenant_id)
  .order('datetime_utc', { ascending: false });
```

**Updated:**
```typescript
// For single-restaurant tenants: no change needed (RLS handles it)
// For multi-restaurant tenants: add restaurant selector

const { data: tenant } = await supabase
  .from('tenants')
  .select('is_multi_restaurant, restaurant_count')
  .eq('id', user.tenant_id)
  .single();

// If multi-restaurant, get all restaurants
let selectedRestaurantId = null;
if (tenant.is_multi_restaurant) {
  const { data: restaurants } = await supabase
    .from('restaurant_info')
    .select('id, name, slug')
    .eq('tenant_id', user.tenant_id)
    .order('name');

  // Show restaurant selector dropdown
  // selectedRestaurantId from state/query params
}

// Fetch reservations (optionally filtered by restaurant)
const query = supabase
  .from('reservations')
  .select(`
    *,
    restaurant_info:restaurant_id (
      id,
      name,
      slug,
      phone
    )
  `)
  .eq('tenant_id', user.tenant_id)
  .order('datetime_utc', { ascending: false });

if (selectedRestaurantId) {
  query.eq('restaurant_id', selectedRestaurantId);
}

const { data: reservations } = await query;
```

### 2. Add Restaurant Column to Reservations Table

#### File: `app/reservations-view.tsx`

**Add new column:**
```typescript
{
  accessorKey: 'restaurant_info.name',
  header: 'Restaurante',
  cell: ({ row }) => {
    const restaurant = row.original.restaurant_info;
    if (!restaurant) return <span className="text-zinc-500">-</span>;
    return (
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-zinc-400" />
        <span>{restaurant.name}</span>
      </div>
    );
  },
}
```

**Note:** Only show this column for multi-restaurant tenants.

### 3. Add Restaurant Selector Component

#### New File: `components/restaurant-selector.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { Building2, ChevronDown } from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
}

export function RestaurantSelector({
  tenantId,
  onSelect,
}: {
  tenantId: string;
  onSelect: (restaurantId: string | null) => void;
}) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function loadRestaurants() {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from('restaurant_info')
        .select('id, name, slug, phone')
        .eq('tenant_id', tenantId)
        .order('name');

      if (data) {
        setRestaurants(data);
      }
    }
    loadRestaurants();
  }, [tenantId]);

  const handleSelect = (restaurantId: string | null) => {
    setSelected(restaurantId);
    setIsOpen(false);
    onSelect(restaurantId);
  };

  const selectedRestaurant = restaurants.find(r => r.id === selected);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-colors"
      >
        <Building2 className="w-4 h-4 text-zinc-400" />
        <span className="text-sm">
          {selectedRestaurant ? selectedRestaurant.name : 'Todos los restaurantes'}
        </span>
        <ChevronDown className="w-4 h-4 text-zinc-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-10">
          <button
            onClick={() => handleSelect(null)}
            className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 transition-colors rounded-t-lg"
          >
            Todos los restaurantes
          </button>
          {restaurants.map((restaurant) => (
            <button
              key={restaurant.id}
              onClick={() => handleSelect(restaurant.id)}
              className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 transition-colors"
            >
              {restaurant.name}
              {restaurant.phone && (
                <span className="block text-xs text-zinc-500 mt-1">
                  {restaurant.phone}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4. Update Pending Reservations Page

#### File: `app/pending/page.tsx`

Add same restaurant filtering logic as main page:

```typescript
// Check if multi-restaurant
const { data: tenant } = await supabase
  .from('tenants')
  .select('is_multi_restaurant')
  .eq('id', user.tenant_id)
  .single();

// Add restaurant selector if multi-restaurant
// Filter pending reservations by restaurant if selected
```

### 5. Add Restaurant Management Page (Optional - Phase 2)

#### New File: `app/restaurants/page.tsx`

```typescript
// Full CRUD for restaurants
// - List all restaurants for tenant
// - Add new restaurant
// - Edit restaurant details (name, phone, hours, menu)
// - Delete restaurant (with confirmation)
// - View restaurant-specific stats
```

### 6. Update Dashboard Shell

#### File: `app/dashboard-shell.tsx`

**Current Issue:** Hardcoded "Nombre del restaurante"

**Fix for Single Restaurant:**
```typescript
const { data: restaurants } = await supabase
  .from('restaurant_info')
  .select('name, slug')
  .eq('tenant_id', user.tenant_id)
  .order('name')
  .limit(1);

const restaurantName = restaurants?.[0]?.name || 'Restaurante';
```

**Fix for Multi-Restaurant:**
```typescript
const { data: tenant } = await supabase
  .from('tenants')
  .select('name, is_multi_restaurant, restaurant_count')
  .eq('id', user.tenant_id)
  .single();

const displayName = tenant.is_multi_restaurant
  ? `${tenant.name} (${tenant.restaurant_count} restaurantes)`
  : tenant.name;
```

### 7. Add Restaurant Context (Optional but Recommended)

#### New File: `lib/restaurant-context.tsx`

```typescript
"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";

interface RestaurantContextValue {
  selectedRestaurantId: string | null;
  setSelectedRestaurantId: (id: string | null) => void;
  isMultiRestaurant: boolean;
  restaurants: Restaurant[];
}

const RestaurantContext = createContext<RestaurantContextValue | null>(null);

export function RestaurantProvider({ children, tenantId }: { children: React.ReactNode; tenantId: string }) {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [isMultiRestaurant, setIsMultiRestaurant] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  useEffect(() => {
    async function loadData() {
      const supabase = createSupabaseBrowserClient();

      // Check if multi-restaurant
      const { data: tenant } = await supabase
        .from('tenants')
        .select('is_multi_restaurant')
        .eq('id', tenantId)
        .single();

      setIsMultiRestaurant(tenant?.is_multi_restaurant || false);

      // Load restaurants
      const { data: restaurantData } = await supabase
        .from('restaurant_info')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');

      if (restaurantData) {
        setRestaurants(restaurantData);
      }
    }
    loadData();
  }, [tenantId]);

  return (
    <RestaurantContext.Provider value={{
      selectedRestaurantId,
      setSelectedRestaurantId,
      isMultiRestaurant,
      restaurants
    }}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within RestaurantProvider');
  }
  return context;
}
```

## Implementation Priority

### Phase 1: Critical (Required for Launch)
1. ✅ Run database migration
2. ⏳ Update `app/page.tsx` - Add restaurant join to query
3. ⏳ Update `app/reservations-view.tsx` - Add restaurant column
4. ⏳ Update `app/dashboard-shell.tsx` - Fix hardcoded restaurant name
5. ⏳ Test with single-restaurant tenant (backwards compatibility)

### Phase 2: Important (Before Multi-Restaurant Rollout)
1. ⏳ Create `RestaurantSelector` component
2. ⏳ Add restaurant filtering to main page
3. ⏳ Add restaurant filtering to pending page
4. ⏳ Add restaurant context provider
5. ⏳ Test with multi-restaurant tenant

### Phase 3: Nice-to-Have (Future)
1. ⏳ Restaurant management page (CRUD)
2. ⏳ Per-restaurant analytics dashboard
3. ⏳ Restaurant switcher in header
4. ⏳ Restaurant-specific settings page

## Testing Checklist

### Single-Restaurant Tenant
- [ ] Can view all reservations
- [ ] Reservation table shows correct data
- [ ] Dashboard shows restaurant name
- [ ] Pending reservations page works
- [ ] No errors in console

### Multi-Restaurant Tenant
- [ ] Can see restaurant selector
- [ ] Can filter by restaurant
- [ ] "All restaurants" shows all
- [ ] Reservation table shows restaurant column
- [ ] Dashboard shows tenant name + count
- [ ] Switching restaurants updates view

### Edge Cases
- [ ] Tenant with 0 restaurants (shouldn't happen)
- [ ] Tenant with 1 restaurant (should act like single)
- [ ] Tenant with 10+ restaurants (dropdown scrolls)
- [ ] Restaurant deleted (historical reservations still show)

## Database Queries Reference

### Get Tenant Info
```sql
SELECT
  id,
  name,
  is_multi_restaurant,
  restaurant_count
FROM tenants
WHERE id = $1;
```

### Get Restaurants for Tenant
```sql
SELECT
  id,
  name,
  slug,
  phone,
  email,
  address
FROM restaurant_info
WHERE tenant_id = $1
ORDER BY name;
```

### Get Reservations with Restaurant
```sql
SELECT
  r.*,
  ri.name AS restaurant_name,
  ri.slug AS restaurant_slug,
  ri.phone AS restaurant_phone
FROM reservations r
LEFT JOIN restaurant_info ri ON ri.id = r.restaurant_id
WHERE r.tenant_id = $1
  AND ($2::uuid IS NULL OR r.restaurant_id = $2)
ORDER BY r.datetime_utc DESC;
```

### Get Stats Per Restaurant
```sql
SELECT
  ri.name,
  COUNT(r.id) AS total_reservations,
  COUNT(r.id) FILTER (WHERE r.status = 'confirmed') AS confirmed,
  COUNT(r.id) FILTER (WHERE r.status = 'canceled') AS canceled,
  SUM(r.party_size) AS total_guests
FROM restaurant_info ri
LEFT JOIN reservations r ON r.restaurant_id = ri.id
WHERE ri.tenant_id = $1
  AND r.created_at >= NOW() - INTERVAL '30 days'
GROUP BY ri.id, ri.name
ORDER BY total_reservations DESC;
```

## Migration Risk Assessment

### Low Risk (Backwards Compatible)
- ✅ Database migration has backfill
- ✅ RLS policies still work
- ✅ Existing single-restaurant tenants unaffected
- ✅ Legacy `business_id` still populated

### Medium Risk (Requires Testing)
- ⚠️ Portal queries need restaurant_id join
- ⚠️ UI changes for multi-restaurant
- ⚠️ Need to handle NULL restaurant_id gracefully

### High Risk (Breaking Change)
- ❌ None identified

## Rollout Plan

1. **Dev Environment**
   - Run migration
   - Update portal code
   - Test with test tenant

2. **Staging Environment**
   - Run migration
   - Deploy portal updates
   - Test with production-like data

3. **Production**
   - Schedule maintenance window
   - Backup database
   - Run migration
   - Deploy portal
   - Monitor logs
   - Rollback plan ready

## Success Criteria

✅ **Migration Successful If:**
- All existing reservations have `restaurant_id`
- Single-restaurant tenants work as before
- No errors in portal loading
- New reservations created via bot include `restaurant_id`
- RLS policies still enforce tenant isolation

## Support & Troubleshooting

**Common Issues:**

1. **"Reservations not showing"**
   - Check RLS policies
   - Verify user has correct tenant_id
   - Check browser console for errors

2. **"Restaurant column shows null"**
   - Check migration backfill completed
   - Verify join is correct in query

3. **"Can't filter by restaurant"**
   - Check is_multi_restaurant flag set correctly
   - Verify restaurant selector state management

**Debugging Queries:**

```sql
-- Verify migration completed
SELECT
  COUNT(*) AS total,
  COUNT(restaurant_id) AS with_restaurant_id
FROM reservations;

-- Should be equal!

-- Check multi-restaurant tenants
SELECT
  id,
  name,
  is_multi_restaurant,
  restaurant_count
FROM tenants
WHERE is_multi_restaurant = true;
```

## Next Steps

1. Review this document with team
2. Create GitLab issues for each task
3. Estimate effort for each phase
4. Schedule Phase 1 implementation
5. Begin portal updates

---

**Last Updated:** 2025-01-17
**Status:** Ready for Implementation
**Owner:** Development Team
