use DBDATACORA;
go

if col_length('dbo.profiles', 'last_login_at') is null
begin
  alter table dbo.profiles
  add last_login_at datetimeoffset null;
end
go

