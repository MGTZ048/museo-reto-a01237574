-- Los Secretos del Arocena · base de datos
-- Tablas para reservas (RF1–RF4) y solicitudes de grupos (RF5).
-- Seguridad: la página (rol anon) solo puede INSERTAR. Nadie puede leer
-- los datos personales con la anon key; el cupo se consulta con slot_counts().

create table if not exists public.reservas (
  id          bigint generated always as identity primary key,
  code        text not null unique,
  slot_id     text not null,
  fecha       text not null,
  horario     text not null,
  modalidad   text not null check (modalidad in ('Día', 'Noche')),
  equipo      text not null check (char_length(equipo) between 1 and 60),
  personas    int  not null check (personas between 4 and 6),
  total       int  not null check (total > 0),
  nombre      text not null check (char_length(nombre) between 1 and 120),
  correo      text not null check (correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  telefono    text not null check (char_length(telefono) between 10 and 20),
  created_at  timestamptz not null default now()
);

create table if not exists public.solicitudes (
  id           bigint generated always as identity primary key,
  tipo         text not null check (tipo in ('Escuela', 'Empresa', 'Cumpleaños', 'Otro')),
  nombre       text not null check (char_length(nombre) between 1 and 120),
  institucion  text not null check (char_length(institucion) between 1 and 160),
  personas     int  not null check (personas between 4 and 1000),
  fecha        date not null,
  correo       text not null check (correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  telefono     text not null check (char_length(telefono) between 10 and 20),
  created_at   timestamptz not null default now()
);

create index if not exists reservas_slot_idx on public.reservas (slot_id);

-- RLS: solo insertar desde la página
alter table public.reservas    enable row level security;
alter table public.solicitudes enable row level security;

drop policy if exists "anon inserta reservas" on public.reservas;
create policy "anon inserta reservas" on public.reservas
  for insert to anon with check (true);

drop policy if exists "anon inserta solicitudes" on public.solicitudes;
create policy "anon inserta solicitudes" on public.solicitudes
  for insert to anon with check (true);

-- RF2: máximo 2 equipos por horario, validado en el servidor
create or replace function public.check_cupo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.slot_id));
  if (select count(*) from public.reservas where slot_id = new.slot_id) >= 2 then
    raise exception 'HORARIO_LLENO' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists reservas_cupo on public.reservas;
create trigger reservas_cupo before insert on public.reservas
  for each row execute function public.check_cupo();

-- Cupo por horario sin exponer datos personales
create or replace function public.slot_counts()
returns table (slot_id text, equipos bigint)
language sql stable security definer set search_path = public as $$
  select slot_id, count(*) from public.reservas group by slot_id;
$$;

revoke all on function public.slot_counts() from public;
grant execute on function public.slot_counts() to anon, authenticated;
