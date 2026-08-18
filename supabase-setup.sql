-- ============================================
-- 전남온라인학교 FAQ - Supabase 초기 설정
-- ============================================

-- FAQ 테이블
create table if not exists faqs (
  id uuid default gen_random_uuid() primary key,
  category text,
  question text not null,
  answer text not null,
  helpful_yes integer default 0,
  helpful_no integer default 0,
  created_at timestamptz default now()
);

-- 질문 게시판 테이블
create table if not exists posts (
  id uuid default gen_random_uuid() primary key,
  author text,
  author_email text,
  category text,
  title text not null,
  content text not null,
  answer text,
  answered_at timestamptz,
  created_at timestamptz default now()
);

-- 관리자 테이블
create table if not exists admins (
  email text primary key,
  name text,
  created_at timestamptz default now()
);

-- 관리자 여부 확인 함수
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from admins
    where email = auth.jwt() ->> 'email'
  );
$$;

-- ============================================
-- RLS (Row Level Security)
-- ============================================
alter table faqs enable row level security;
alter table posts enable row level security;
alter table admins enable row level security;

-- 기존 정책 제거 (재실행 대비)
drop policy if exists "FAQ 읽기" on faqs;
drop policy if exists "FAQ 쓰기" on faqs;
drop policy if exists "FAQ 도움 투표" on faqs;
drop policy if exists "게시판 읽기" on posts;
drop policy if exists "게시판 등록" on posts;
drop policy if exists "게시판 수정" on posts;
drop policy if exists "게시판 삭제" on posts;
drop policy if exists "관리자 목록 조회" on admins;
drop policy if exists "관리자 추가" on admins;
drop policy if exists "관리자 삭제" on admins;
drop policy if exists "FAQ 등록" on faqs;
drop policy if exists "FAQ 수정" on faqs;
drop policy if exists "FAQ 삭제" on faqs;

-- FAQ: 누구나 읽기, 관리자만 등록/수정/삭제
create policy "FAQ 읽기" on faqs for select using (true);
create policy "FAQ 등록" on faqs for insert with check (is_admin());
create policy "FAQ 수정" on faqs for update using (is_admin());
create policy "FAQ 삭제" on faqs for delete using (is_admin());

-- 게시판: 누구나 읽기, 로그인 사용자만 등록, 관리자만 수정/삭제
create policy "게시판 읽기" on posts for select using (true);
create policy "게시판 등록" on posts for insert
  with check (auth.role() = 'authenticated');
create policy "게시판 수정" on posts for update using (is_admin());
create policy "게시판 삭제" on posts for delete using (is_admin());

-- 관리자 테이블: 로그인 사용자는 조회 가능, 관리자만 추가/삭제
create policy "관리자 목록 조회" on admins for select
  using (auth.role() = 'authenticated');
create policy "관리자 추가" on admins for insert with check (is_admin());
create policy "관리자 삭제" on admins for delete using (is_admin());

-- ============================================
-- FAQ 도움됐어요 투표 (RLS 우회 함수)
-- ============================================
create or replace function vote_helpful(faq_id uuid, is_yes boolean)
returns void
language plpgsql
security definer
as $$
begin
  if is_yes then
    update faqs set helpful_yes = coalesce(helpful_yes, 0) + 1 where id = faq_id;
  else
    update faqs set helpful_no = coalesce(helpful_no, 0) + 1 where id = faq_id;
  end if;
end;
$$;

-- ============================================
-- 관리자 등록 (본인 이메일로 변경하세요!)
-- ============================================
insert into admins (email, name) values
  ('cos2104@gmail.com', '관리자'),
  ('k203719@ai.jne.kr', '관리자')
on conflict (email) do nothing;
