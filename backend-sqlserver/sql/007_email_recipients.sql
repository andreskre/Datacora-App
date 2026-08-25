use DBDATACORA;
go

if object_id(N'dbo.form_email_recipients', N'U') is null
begin
  create table dbo.form_email_recipients (
    id uniqueidentifier not null primary key default newid(),
    rbd nvarchar(30) not null,
    email nvarchar(320) not null,
    recipient_kind nvarchar(40) not null default 'supervisor',
    source_name nvarchar(120) not null default 'manual',
    is_active bit not null default 1,
    created_at datetimeoffset not null default sysdatetimeoffset(),
    updated_at datetimeoffset not null default sysdatetimeoffset(),
    constraint ck_form_email_recipients_kind check (recipient_kind in ('supervisor', 'pae', 'jefatura', 'operaciones', 'otro')),
    constraint uq_form_email_recipients unique (rbd, email, recipient_kind, source_name)
  );
end;
go

if not exists (
  select 1
  from sys.indexes
  where object_id = object_id(N'dbo.form_email_recipients')
    and name = N'idx_form_email_recipients_rbd_active'
)
begin
  create index idx_form_email_recipients_rbd_active
    on dbo.form_email_recipients (rbd, is_active);
end;
go
