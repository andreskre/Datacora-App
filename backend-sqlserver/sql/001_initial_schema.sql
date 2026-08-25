
  use DBDATACORA;
  Go

  create table dbo.branches (
    id uniqueidentifier not null primary key default newid(),
    name nvarchar(120) not null unique,
    is_active bit not null default 1,
    created_at datetimeoffset not null default sysdatetimeoffset()
  );

  create table dbo.groups (
    id uniqueidentifier not null primary key default newid(),
    name nvarchar(120) not null unique,
    created_at datetimeoffset not null default sysdatetimeoffset()
  );

  create table dbo.roles (
    id uniqueidentifier not null primary key default newid(),
    name nvarchar(120) not null unique,
    can_manage_users bit not null default 0,
    can_assign_tasks bit not null default 0,
    can_view_notifications bit not null default 0,
    can_view_national_data bit not null default 0,
    created_at datetimeoffset not null default sysdatetimeoffset()
  );

  create table dbo.profiles (
    id uniqueidentifier not null primary key default newid(),
    full_name nvarchar(200) not null,
    email nvarchar(320) not null unique,
    rut nvarchar(20) null,
    branch_id uniqueidentifier null references dbo.branches(id),
    group_id uniqueidentifier null references dbo.groups(id),
    role_id uniqueidentifier null references dbo.roles(id),
    status nvarchar(30) not null default 'activo',
    status_reason nvarchar(200) not null default 'Disponible',
    password_hash nvarchar(255) not null,
    require_password_change bit not null default 1,
    created_at datetimeoffset not null default sysdatetimeoffset(),
    updated_at datetimeoffset not null default sysdatetimeoffset(),
    deleted_at datetimeoffset null
  );

  create table dbo.profile_branches (
    profile_id uniqueidentifier not null references dbo.profiles(id),
    branch_id uniqueidentifier not null references dbo.branches(id),
    primary key (profile_id, branch_id)
  );

  create table dbo.establishments (
    id uniqueidentifier not null primary key default newid(),
    rbd nvarchar(30) not null unique,
    name nvarchar(250) not null,
    commune nvarchar(120) null,
    institution_type nvarchar(120) null,
    address nvarchar(300) null,
    branch_id uniqueidentifier null references dbo.branches(id),
    latitude decimal(10,7) null,
    longitude decimal(10,7) null,
    created_at datetimeoffset not null default sysdatetimeoffset()
  );

  create table dbo.form_templates (
    id uniqueidentifier not null primary key default newid(),
    code nvarchar(80) not null,
    visit_type nvarchar(120) not null,
    title nvarchar(200) not null,
    created_at datetimeoffset not null default sysdatetimeoffset()
  );

  create table dbo.form_sections (
    id uniqueidentifier not null primary key default newid(),
    template_id uniqueidentifier not null references dbo.form_templates(id),
    code nvarchar(80) not null,
    title nvarchar(200) not null,
    sort_order int not null default 1,
    constraint uq_form_sections_template_code unique (template_id, code)
  );

  create table dbo.form_questions (
    id uniqueidentifier not null primary key default newid(),
    section_id uniqueidentifier not null references dbo.form_sections(id),
    code nvarchar(80) not null,
    label nvarchar(300) not null,
    answer_type nvarchar(40) not null default 'text',
    sort_order int not null default 1,
    is_required bit not null default 0,
    constraint uq_form_questions_section_code unique (section_id, code)
  );

  create table dbo.tasks (
    id uniqueidentifier not null primary key default newid(),
    task_type nvarchar(120) not null,
    establishment_id uniqueidentifier not null references dbo.establishments(id),
    assigned_to uniqueidentifier not null references dbo.profiles(id),
    assigned_by uniqueidentifier not null references dbo.profiles(id),
    form_template_id uniqueidentifier null references dbo.form_templates(id),
    description nvarchar(500) null,
    due_date date null,
    status nvarchar(40) not null default 'pendiente',
    priority nvarchar(40) not null default 'media',
    sync_state nvarchar(40) not null default 'pending',
    assigned_at datetimeoffset not null default sysdatetimeoffset(),
    created_at datetimeoffset not null default sysdatetimeoffset(),
    updated_at datetimeoffset not null default sysdatetimeoffset()
  );

  create table dbo.task_required_sections (
    task_id uniqueidentifier not null references dbo.tasks(id),
    section_id uniqueidentifier not null references dbo.form_sections(id),
    is_required bit not null default 0,
    is_critical bit not null default 0,
    min_required int null,
    primary key (task_id, section_id)
  );

  create sequence dbo.form_submission_folio_seq as int start with 1 increment by 1;

  create table dbo.form_submissions (
    id uniqueidentifier not null primary key default newid(),
    task_id uniqueidentifier not null references dbo.tasks(id),
    technician_id uniqueidentifier not null references dbo.profiles(id),
    status nvarchar(40) not null default 'submitted',
    local_uuid uniqueidentifier not null unique,
    folio int not null default next value for dbo.form_submission_folio_seq,
    submitted_at datetimeoffset not null,
    synced_at datetimeoffset not null default sysdatetimeoffset()
  );

  create table dbo.response_items (
    id uniqueidentifier not null primary key default newid(),
    submission_id uniqueidentifier not null references dbo.form_submissions(id),
    section_id uniqueidentifier not null references dbo.form_sections(id),
    item_index int not null,
    item_label nvarchar(300) not null
  );

  create table dbo.form_answers (
    id uniqueidentifier not null primary key default newid(),
    submission_id uniqueidentifier not null references dbo.form_submissions(id),
    response_item_id uniqueidentifier null references dbo.response_items(id),
    section_id uniqueidentifier not null references dbo.form_sections(id),
    question_id uniqueidentifier not null references dbo.form_questions(id),
    answer_type nvarchar(40) not null,
    answer_text nvarchar(max) null,
    answer_number decimal(18,4) null,
    answer_date date null,
    answer_boolean bit null,
    answer_json nvarchar(max) null
  );

  create table dbo.form_attachments (
    id uniqueidentifier not null primary key default newid(),
    submission_id uniqueidentifier not null references dbo.form_submissions(id),
    file_kind nvarchar(40) not null,
    storage_provider nvarchar(40) not null,
    storage_path nvarchar(1000) not null,
    external_url nvarchar(1000) null,
    external_id nvarchar(300) null,
    mime_type nvarchar(100) not null,
    file_name nvarchar(255) not null,
    metadata nvarchar(max) null,
    created_at datetimeoffset not null default sysdatetimeoffset()
  );

  create table dbo.device_push_tokens (
    id uniqueidentifier not null primary key default newid(),
    user_id uniqueidentifier not null references dbo.profiles(id),
    token nvarchar(1000) not null unique,
    is_active bit not null default 1,
    created_at datetimeoffset not null default sysdatetimeoffset(),
    updated_at datetimeoffset not null default sysdatetimeoffset()
  );

  create table dbo.sync_events (
    id uniqueidentifier not null primary key default newid(),
    user_id uniqueidentifier null references dbo.profiles(id),
    event_type nvarchar(80) not null,
    metadata nvarchar(max) null,
    created_at datetimeoffset not null default sysdatetimeoffset()
  );
