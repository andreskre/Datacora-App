use DBDATACORA;
go

if object_id(N'dbo.article_catalog', N'U') is null
begin
  create table dbo.article_catalog (
    id nvarchar(50) not null primary key,
    name nvarchar(300) not null,
    is_active bit not null default 1,
    created_at datetimeoffset not null default sysdatetimeoffset(),
    updated_at datetimeoffset not null default sysdatetimeoffset()
  );
end;
go
