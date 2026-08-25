set nocount on;

if object_id('dbo.procedure_user_events', 'U') is null
begin
  create table dbo.procedure_user_events (
    procedure_id uniqueidentifier not null references dbo.procedures(id),
    user_id uniqueidentifier not null references dbo.profiles(id),
    viewed_at datetimeoffset null,
    downloaded_at datetimeoffset null,
    last_event_at datetimeoffset not null default sysdatetimeoffset(),
    created_at datetimeoffset not null default sysdatetimeoffset(),
    constraint pk_procedure_user_events primary key (procedure_id, user_id)
  );
end;

if not exists (select 1 from sys.indexes where name = 'ix_procedure_user_events_user' and object_id = object_id('dbo.procedure_user_events'))
begin
  create index ix_procedure_user_events_user on dbo.procedure_user_events(user_id, last_event_at desc);
end;

if not exists (select 1 from sys.indexes where name = 'ix_procedure_user_events_procedure' and object_id = object_id('dbo.procedure_user_events'))
begin
  create index ix_procedure_user_events_procedure on dbo.procedure_user_events(procedure_id, last_event_at desc);
end;
