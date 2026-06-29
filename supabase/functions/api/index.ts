import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const OTP_SECRET = Deno.env.get('TICKET_OTP_SECRET') ?? SUPABASE_SERVICE_ROLE_KEY;
const DEV_OTP_MODE = (Deno.env.get('TICKET_OTP_DEV_MODE') ?? 'true') === 'true';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bootstrap-token',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type Json = Record<string, unknown>;

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function error(message: string, status = 400) {
  return response({ detail: message, message }, status);
}

async function body(req: Request): Promise<Json> {
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return await req.json();
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(await req.text()));
  }
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    return Object.fromEntries(form.entries());
  }
  return {};
}

async function authContext(req: Request) {
  const authorization = req.headers.get('authorization');
  if (!authorization) return null;

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { authorization } },
    auth: { persistSession: false },
  });

  const { data, error: authError } = await userClient.auth.getUser();
  if (authError || !data.user) return null;

  const { data: profile } = await service
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile || profile.is_active === false) return null;
  return { user: data.user, profile };
}

async function requireAuth(req: Request) {
  const ctx = await authContext(req);
  if (!ctx) throw new Response(JSON.stringify({ detail: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
  return ctx;
}

async function otpHash(assetId: string, otp: string) {
  const data = new TextEncoder().encode(`${assetId}:${otp}:${OTP_SECRET}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function normalizePath(url: URL) {
  const normalized = url.pathname.replace(/^\/api/, '');
  return normalized || '/';
}

function mapEmployee(row: any) {
  return {
    ...row,
    company_name: row.companies?.name ?? row.company_name ?? null,
  };
}

function mapAsset(row: any) {
  const type = row.asset_types;
  const employee = row.employees;
  const company = row.companies;
  return {
    ...row,
    name: row.name ?? type?.name ?? row.asset_code,
    asset_type_name: type?.name ?? null,
    asset_type_category: type?.category ?? null,
    company_name: company?.name ?? null,
    assigned_to: employee
      ? {
          id: employee.id,
          full_name: employee.full_name,
          employee_code: employee.employee_code,
          email: employee.email,
        }
      : null,
  };
}

async function listAssets(isOtherAsset: boolean | null) {
  let query = service
    .from('assets')
    .select('*, asset_types(*), employees(*), companies(*)')
    .order('created_at', { ascending: false });

  if (isOtherAsset !== null) query = query.eq('is_other_asset', isOtherAsset);

  const { data, error: dbError } = await query;
  if (dbError) return error(dbError.message, 500);
  return response((data ?? []).map(mapAsset));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = normalizePath(url);
    const method = req.method;

    if (method === 'POST' && path === '/admin/bootstrap') {
      const bootstrapToken = Deno.env.get('BOOTSTRAP_TOKEN');
      if (!bootstrapToken || req.headers.get('x-bootstrap-token') !== bootstrapToken) {
        return error('Invalid bootstrap token', 403);
      }

      const payload = await body(req);
      const email = String(payload.email ?? '').trim();
      const password = String(payload.password ?? '');
      const fullName = String(payload.full_name ?? 'Super Admin');

      if (!email || !password) return error('email and password are required');

      const { data: created, error: createError } = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (createError || !created.user) return error(createError?.message ?? 'Unable to create user', 400);

      const permissions = {
        'dashboard.view': true,
        'assets.view': true,
        'assets.create': true,
        'assets.edit': true,
        'assets.delete': true,
        'assets.manage_assignment': true,
        'employees.view': true,
        'employees.create': true,
        'employees.edit': true,
        'employees.delete': true,
        'tickets.view': true,
        'tickets.update': true,
        'reports.view': true,
        'reports.export': true,
      };

      const { error: profileError } = await service.from('profiles').upsert({
        id: created.user.id,
        email,
        full_name: fullName,
        role: 'super_admin',
        permissions,
        is_active: true,
      });
      if (profileError) return error(profileError.message, 500);

      return response({ id: created.user.id, email, role: 'super_admin' }, 201);
    }

    if (method === 'POST' && path === '/users/login') {
      const payload = await body(req);
      const email = String(payload.username ?? payload.email ?? '').trim();
      const password = String(payload.password ?? '');

      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
      });
      const { data, error: loginError } = await client.auth.signInWithPassword({ email, password });
      if (loginError || !data.session || !data.user) return error(loginError?.message ?? 'Invalid login', 401);

      const { data: profile } = await service
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!profile || profile.is_active === false) return error('User is inactive or missing profile', 403);

      return response({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        token_type: data.session.token_type,
        expires_in: data.session.expires_in,
        role: profile.role === 'super_admin' ? 'Super Admin' : 'Admin',
        full_name: profile.full_name,
        permissions: profile.permissions ?? {},
      });
    }

    if (method === 'GET' && path === '/users/validate-token') {
      const ctx = await authContext(req);
      return response({ valid: Boolean(ctx), profile: ctx?.profile ?? null });
    }

    if (method === 'POST' && path === '/users/refresh-token') {
      const payload = await body(req);
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false },
      });
      const { data, error: refreshError } = await client.auth.refreshSession({
        refresh_token: String(payload.refresh_token ?? ''),
      });
      if (refreshError || !data.session) return error(refreshError?.message ?? 'Failed to refresh token', 401);
      return response({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }

    if (method === 'POST' && path === '/users/logout') {
      return response({ message: 'Logged out' });
    }

    if (path === '/companies' && method === 'GET') {
      const { data, error: dbError } = await service.from('companies').select('*').order('name');
      if (dbError) return error(dbError.message, 500);
      return response(data ?? []);
    }

    if (path === '/companies' && method === 'POST') {
      await requireAuth(req);
      const payload = await body(req);
      const { data, error: dbError } = await service
        .from('companies')
        .insert({ name: payload.name, domain: payload.domain ?? null })
        .select()
        .single();
      if (dbError) return error(dbError.message, 400);
      return response(data, 201);
    }

    const companyMatch = path.match(/^\/companies\/([^/]+)$/);
    if (companyMatch && method === 'PUT') {
      await requireAuth(req);
      const payload = await body(req);
      const { data, error: dbError } = await service
        .from('companies')
        .update({ name: payload.name, domain: payload.domain ?? null, updated_at: new Date().toISOString() })
        .eq('id', companyMatch[1])
        .select()
        .single();
      if (dbError) return error(dbError.message, 400);
      return response(data);
    }

    if ((path === '/employees' || path === '/employees/') && method === 'GET') {
      await requireAuth(req);
      const { data, error: dbError } = await service
        .from('employees')
        .select('*, companies(name)')
        .order('created_at', { ascending: false });
      if (dbError) return error(dbError.message, 500);
      return response((data ?? []).map(mapEmployee));
    }

    if ((path === '/employees' || path === '/employees/') && method === 'POST') {
      await requireAuth(req);
      const payload = await body(req);
      const { data, error: dbError } = await service.from('employees').insert(payload).select().single();
      if (dbError) return error(dbError.message, 400);
      return response(data, 201);
    }

    const employeeMatch = path.match(/^\/employees\/([^/]+)$/);
    if (employeeMatch && method === 'PATCH') {
      await requireAuth(req);
      const payload = await body(req);
      const { data, error: dbError } = await service
        .from('employees')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', employeeMatch[1])
        .select()
        .single();
      if (dbError) return error(dbError.message, 400);
      return response(data);
    }

    if (path === '/asset-types/asset-types-dropdown' && method === 'GET') {
      const { data, error: dbError } = await service
        .from('asset_types')
        .select('*')
        .eq('is_other_asset', false)
        .order('name');
      if (dbError) return error(dbError.message, 500);
      return response((data ?? []).map((item) => ({
        ...item,
        value: item.id,
        label: item.name,
        })));
    }

    if (path === '/other-asset-types/dropdown' && method === 'GET') {
      const { data, error: dbError } = await service
        .from('asset_types')
        .select('*')
        .eq('is_other_asset', true)
        .order('name');
      if (dbError) return error(dbError.message, 500);
      return response((data ?? []).map((item) => ({
        ...item,
        value: item.id,
        label: item.name,
      })));
    }

    const assetTypeFieldsMatch = path.match(/^\/asset-types\/asset-types\/([^/]+)\/fields$/);
    if (assetTypeFieldsMatch && method === 'GET') {
      const { data, error: dbError } = await service
        .from('asset_types')
        .select('fields')
        .eq('id', assetTypeFieldsMatch[1])
        .single();
      if (dbError) return error(dbError.message, 404);
      return response({ fields: data.fields ?? [] });
    }

    if (path === '/assets' && method === 'GET') {
      const isOther = url.searchParams.get('is_other_asset');
      return await listAssets(isOther === null ? false : isOther === 'true');
    }

    if (path === '/other-assets' && method === 'GET') {
      return await listAssets(true);
    }

    const assetGetMatch = path.match(/^\/asset\/([^/]+)$/);
    if (assetGetMatch && method === 'GET') {
      const { data, error: dbError } = await service
        .from('assets')
        .select('*, asset_types(*), employees(*), companies(*)')
        .eq('id', assetGetMatch[1])
        .maybeSingle();
      if (dbError || !data) return error('Asset not found', 404);
      return response(mapAsset(data));
    }

    const otherAssetGetMatch = path.match(/^\/other-assets\/([^/]+)$/);
    if (otherAssetGetMatch && method === 'GET') {
      const { data, error: dbError } = await service
        .from('assets')
        .select('*, asset_types(*), employees(*), companies(*)')
        .eq('id', otherAssetGetMatch[1])
        .eq('is_other_asset', true)
        .maybeSingle();
      if (dbError || !data) return error('Asset not found', 404);
      return response(mapAsset(data));
    }

    if ((path === '/asset/create' || path === '/other-assets/create') && method === 'POST') {
      await requireAuth(req);
      const payload = await body(req);
      const fieldValues = payload.field_values ? JSON.parse(String(payload.field_values)) : {};
      const typeId = payload.asset_type_id ?? payload.other_asset_type_id;
      const typeName = payload.asset_type_name ?? payload.other_asset_type_name;
      const isOtherAsset = path === '/other-assets/create' || payload.is_other_asset === 'true';

      const { data, error: dbError } = await service.from('assets').insert({
        asset_code: payload.asset_code,
        name: typeName ?? payload.asset_code,
        asset_type_id: typeId || null,
        company_id: payload.company_id || null,
        location: payload.location || 'IT Room',
        warranty_expiry: payload.warranty_expiry || null,
        tech_specs: fieldValues,
        is_other_asset: isOtherAsset,
      }).select('*, asset_types(*), employees(*), companies(*)').single();

      if (dbError) return error(dbError.message, 400);
      return response(mapAsset(data), 201);
    }

    const assetUpdateMatch = path.match(/^\/asset\/([^/]+)\/update$/);
    if (assetUpdateMatch && method === 'PUT') {
      await requireAuth(req);
      const payload = await body(req);
      const updates: Json = { updated_at: new Date().toISOString() };
      if (payload.asset_status) updates.asset_status = payload.asset_status;
      if (payload.location) updates.location = payload.location;
      if (payload.warranty_expiry) updates.warranty_expiry = payload.warranty_expiry;
      if (payload.field_values) updates.tech_specs = JSON.parse(String(payload.field_values));

      const { data, error: dbError } = await service
        .from('assets')
        .update(updates)
        .eq('id', assetUpdateMatch[1])
        .select('*, asset_types(*), employees(*), companies(*)')
        .single();
      if (dbError) return error(dbError.message, 400);
      return response(mapAsset(data));
    }

    if (path === '/asset-assignment/bulk-assign' && method === 'POST') {
      const ctx = await requireAuth(req);
      const payload = await body(req);
      const assetIds = Array.isArray(payload.asset_ids) ? payload.asset_ids as string[] : [];
      const employeeId = String(payload.employee_id ?? '');
      if (assetIds.length === 0 || !employeeId) return error('asset_ids and employee_id are required');

      const now = new Date().toISOString();
      const { error: updateError } = await service
        .from('assets')
        .update({
          assigned_to: employeeId,
          assigned_by: ctx.user.id,
          assigned_at: now,
          asset_status: 'assigned',
          location: payload.location || 'Assigned',
          updated_at: now,
        })
        .in('id', assetIds);
      if (updateError) return error(updateError.message, 400);

      await service.from('asset_assignments').insert(assetIds.map((assetId) => ({
        asset_id: assetId,
        employee_id: employeeId,
        assigned_by: ctx.user.id,
        location: payload.location ?? null,
        remarks: payload.remarks ?? null,
      })));

      await service.from('asset_logs').insert(assetIds.map((assetId) => ({
        asset_id: assetId,
        action: 'Assigned',
        assigned_to: employeeId,
        assigned_by: ctx.user.id,
        location: payload.location ?? null,
        remarks: payload.remarks ?? null,
      })));

      return response({ message: 'Assets assigned successfully', count: assetIds.length });
    }

    if (path === '/other-asset-assignment/assign' && method === 'POST') {
      const ctx = await requireAuth(req);
      const payload = await body(req);
      const assetId = String(payload.other_asset_id ?? '');
      const employeeId = String(payload.employee_id ?? '');
      if (!assetId || !employeeId) return error('other_asset_id and employee_id are required');

      const now = new Date().toISOString();
      const { error: updateError } = await service
        .from('assets')
        .update({
          assigned_to: employeeId,
          assigned_by: ctx.user.id,
          assigned_at: now,
          asset_status: 'assigned',
          location: payload.assigned_location || 'Assigned',
          updated_at: now,
        })
        .eq('id', assetId)
        .eq('is_other_asset', true);
      if (updateError) return error(updateError.message, 400);

      await service.from('asset_assignments').insert({
        asset_id: assetId,
        employee_id: employeeId,
        assigned_by: ctx.user.id,
        location: payload.assigned_location ?? null,
        remarks: payload.assign_remarks ?? null,
      });

      await service.from('asset_logs').insert({
        asset_id: assetId,
        action: 'Assigned',
        assigned_to: employeeId,
        assigned_by: ctx.user.id,
        location: payload.assigned_location ?? null,
        remarks: payload.assign_remarks ?? null,
      });

      return response({ message: 'Other asset assigned successfully' });
    }

    if ((path === '/asset-assignment/unassign' || path === '/other-asset-assignment/unassign') && method === 'POST') {
      const ctx = await requireAuth(req);
      const payload = await body(req);
      const assetId = String(payload.asset_id ?? payload.other_asset_id ?? '');
      if (!assetId) return error('asset_id is required');

      const now = new Date().toISOString();
      const { data: asset, error: getError } = await service.from('assets').select('*').eq('id', assetId).single();
      if (getError || !asset) return error('Asset not found', 404);

      const { error: updateError } = await service
        .from('assets')
        .update({
          assigned_to: null,
          assigned_by: null,
          assigned_at: null,
          asset_status: 'available',
          location: payload.location || 'IT Room',
          updated_at: now,
        })
        .eq('id', assetId);
      if (updateError) return error(updateError.message, 400);

      await service
        .from('asset_assignments')
        .update({ status: 'returned', returned_at: now, remarks: payload.remarks ?? null })
        .eq('asset_id', assetId)
        .eq('status', 'active');

      await service.from('asset_logs').insert({
        asset_id: assetId,
        action: 'Returned',
        assigned_to: asset.assigned_to,
        assigned_by: ctx.user.id,
        location: payload.location ?? null,
        remarks: payload.remarks ?? null,
      });

      return response({ message: 'Asset returned successfully' });
    }

    if (path === '/tickets/request-otp' && method === 'POST') {
      const payload = await body(req);
      const assetId = String(payload.asset_id ?? '');
      const { data: asset, error: dbError } = await service
        .from('assets')
        .select('id, asset_status, assigned_to, employees(email, full_name)')
        .eq('id', assetId)
        .maybeSingle();
      if (dbError || !asset) return error('Asset not found', 404);
      if (asset.asset_status !== 'assigned' || !asset.assigned_to) return error('Ticket can be raised only for assigned assets', 400);

      const otp = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error: insertError } = await service.from('ticket_otps').insert({
        asset_id: asset.id,
        employee_id: asset.assigned_to,
        otp_hash: await otpHash(asset.id, otp),
        expires_at: expiresAt,
      });
      if (insertError) return error(insertError.message, 500);

      return response({
        message: DEV_OTP_MODE
          ? `Test OTP generated for ${asset.employees?.email ?? 'assigned employee'}`
          : 'OTP sent to assigned employee email',
        dev_otp: DEV_OTP_MODE ? otp : undefined,
      });
    }

    if (path === '/tickets/verify-otp' && method === 'POST') {
      const payload = await body(req);
      const assetId = String(payload.asset_id ?? '');
      const otp = String(payload.otp_code ?? '');
      const hash = await otpHash(assetId, otp);

      const { data: otpRow, error: dbError } = await service
        .from('ticket_otps')
        .select('*')
        .eq('asset_id', assetId)
        .eq('otp_hash', hash)
        .eq('verified', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (dbError || !otpRow) return error('Invalid or expired OTP', 400);

      await service.from('ticket_otps').update({
        verified: true,
        verified_at: new Date().toISOString(),
      }).eq('id', otpRow.id);

      return response({ message: 'OTP verified' });
    }

    if (path === '/tickets/create' && method === 'POST') {
      const payload = await body(req);
      const assetId = String(payload.asset_id ?? '');
      const otp = String(payload.otp_code ?? '');
      const hash = await otpHash(assetId, otp);

      const { data: otpRow } = await service
        .from('ticket_otps')
        .select('*')
        .eq('asset_id', assetId)
        .eq('otp_hash', hash)
        .eq('verified', true)
        .gt('expires_at', new Date().toISOString())
        .order('verified_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!otpRow) return error('OTP verification required', 400);

      const { data, error: dbError } = await service
        .from('tickets')
        .insert({
          asset_id: assetId,
          employee_id: otpRow.employee_id,
          subject: payload.subject,
          description: payload.description,
          priority: payload.priority ?? 'medium',
          status: 'open',
        })
        .select('*, assets(asset_code, name), employees(full_name)')
        .single();
      if (dbError) return error(dbError.message, 400);
      return response(data, 201);
    }

    if ((path === '/tickets' || path === '/tickets/') && method === 'GET') {
      await requireAuth(req);
      const { data, error: dbError } = await service
        .from('tickets')
        .select('*, assets(asset_code, name), employees(full_name)')
        .order('created_at', { ascending: false });
      if (dbError) return error(dbError.message, 500);
      return response((data ?? []).map((ticket) => ({
        ...ticket,
        asset_code: ticket.assets?.asset_code ?? null,
        asset_name: ticket.assets?.name ?? null,
        employee_name: ticket.employees?.full_name ?? null,
      })));
    }

    const ticketMatch = path.match(/^\/tickets\/([^/]+)$/);
    if (ticketMatch && method === 'PATCH') {
      await requireAuth(req);
      const payload = await body(req);
      const { data, error: dbError } = await service
        .from('tickets')
        .update({
          status: payload.status,
          priority: payload.priority,
          resolution_notes: payload.resolution_notes ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketMatch[1])
        .select()
        .single();
      if (dbError) return error(dbError.message, 400);
      return response(data);
    }

    if (path === '/dashboard/stats' && method === 'GET') {
      await requireAuth(req);
      const [
        assetsTotal,
        employeesTotal,
        ticketsTotal,
        assignedAssets,
        availableAssets,
        maintenanceAssets,
        decommissionedAssets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
      ] = await Promise.all([
        service.from('assets').select('id', { count: 'exact', head: true }),
        service.from('employees').select('id', { count: 'exact', head: true }),
        service.from('tickets').select('id', { count: 'exact', head: true }),
        service.from('assets').select('id', { count: 'exact', head: true }).eq('asset_status', 'assigned'),
        service.from('assets').select('id', { count: 'exact', head: true }).eq('asset_status', 'available'),
        service.from('assets').select('id', { count: 'exact', head: true }).eq('asset_status', 'maintenance'),
        service.from('assets').select('id', { count: 'exact', head: true }).eq('asset_status', 'decommissioned'),
        service.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        service.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
        service.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
        service.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'closed'),
      ]);

      return response({
        assets: {
          total: assetsTotal.count ?? 0,
          assigned: assignedAssets.count ?? 0,
          available: availableAssets.count ?? 0,
          maintenance: maintenanceAssets.count ?? 0,
          decommissioned: decommissionedAssets.count ?? 0,
        },
        employees: { total: employeesTotal.count ?? 0 },
        tickets: {
          total: ticketsTotal.count ?? 0,
          open: openTickets.count ?? 0,
          in_progress: inProgressTickets.count ?? 0,
          resolved: resolvedTickets.count ?? 0,
          closed: closedTickets.count ?? 0,
        },
        stock: { total_items: 0, total_value: 0 },
      });
    }

    return error(`Route not found: ${method} ${path}`, 404);
  } catch (err) {
    if (err instanceof Response) return err;
    return error(err instanceof Error ? err.message : 'Unexpected error', 500);
  }
});
