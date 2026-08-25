/*
  Procedimientos Datacora.
  Permite que administradores o jefatura nacional publiquen documentos
  consultables por tecnicos y jefes de mantencion desde la app.
*/

if object_id('dbo.procedures', 'U') is null
begin
  create table dbo.procedures (
    id uniqueidentifier not null primary key default newid(),
    title nvarchar(180) not null,
    description nvarchar(max) null,
    category nvarchar(120) null,
    file_name nvarchar(260) null,
    file_mime nvarchar(160) null,
    file_data varbinary(max) null,
    external_url nvarchar(1000) null,
    created_by uniqueidentifier not null references dbo.profiles(id),
    created_at datetimeoffset not null default sysdatetimeoffset(),
    updated_at datetimeoffset null,
    deleted_at datetimeoffset null
  );
end;

if not exists (select 1 from sys.indexes where name = 'ix_procedures_created_at' and object_id = object_id('dbo.procedures'))
begin
  create index ix_procedures_created_at on dbo.procedures(created_at desc);
end;

if not exists (select 1 from sys.indexes where name = 'ix_procedures_category' and object_id = object_id('dbo.procedures'))
begin
  create index ix_procedures_category on dbo.procedures(category, created_at desc);
end;
