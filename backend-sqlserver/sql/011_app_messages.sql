/*
  Comunicados internos Datacora.
  Permite que administradores o jefatura nacional envien mensajes a Jefes de Mantencion.
*/

if object_id('dbo.app_message_recipients', 'U') is null
begin
  create table dbo.app_message_recipients (
    id uniqueidentifier not null primary key default newid(),
    message_id uniqueidentifier not null,
    recipient_id uniqueidentifier not null references dbo.profiles(id),
    read_at datetimeoffset null,
    created_at datetimeoffset not null default sysdatetimeoffset(),
    constraint uq_app_message_recipients unique (message_id, recipient_id)
  );
end;

if object_id('dbo.app_messages', 'U') is null
begin
  create table dbo.app_messages (
    id uniqueidentifier not null primary key default newid(),
    title nvarchar(160) not null,
    body nvarchar(max) not null,
    scope nvarchar(40) not null default N'jefes_mantencion',
    branch_id uniqueidentifier null references dbo.branches(id),
    sender_id uniqueidentifier not null references dbo.profiles(id),
    created_at datetimeoffset not null default sysdatetimeoffset(),
    deleted_at datetimeoffset null
  );
end;

if not exists (
  select 1
  from sys.foreign_keys
  where name = 'fk_app_message_recipients_messages'
)
begin
  alter table dbo.app_message_recipients
  add constraint fk_app_message_recipients_messages
  foreign key (message_id) references dbo.app_messages(id);
end;

if not exists (select 1 from sys.indexes where name = 'ix_app_messages_created_at' and object_id = object_id('dbo.app_messages'))
begin
  create index ix_app_messages_created_at on dbo.app_messages(created_at desc);
end;

if not exists (select 1 from sys.indexes where name = 'ix_app_message_recipients_user' and object_id = object_id('dbo.app_message_recipients'))
begin
  create index ix_app_message_recipients_user on dbo.app_message_recipients(recipient_id, read_at, created_at desc);
end;

if object_id('dbo.app_message_replies', 'U') is null
begin
  create table dbo.app_message_replies (
    id uniqueidentifier not null primary key default newid(),
    message_id uniqueidentifier not null references dbo.app_messages(id),
    sender_id uniqueidentifier not null references dbo.profiles(id),
    body nvarchar(max) not null,
    created_at datetimeoffset not null default sysdatetimeoffset()
  );
end;

if not exists (select 1 from sys.indexes where name = 'ix_app_message_replies_message' and object_id = object_id('dbo.app_message_replies'))
begin
  create index ix_app_message_replies_message on dbo.app_message_replies(message_id, created_at);
end;
