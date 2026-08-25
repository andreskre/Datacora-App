/*
  Destinatarios por cargo para procedimientos.
  Guarda los perfiles que pueden visualizar cada procedimiento publicado.
*/

if col_length('dbo.procedures', 'target_roles') is null
begin
  alter table dbo.procedures
  add target_roles nvarchar(400) null;
end;

update dbo.procedures
set target_roles = N'["technician","jm"]'
where target_roles is null;

if not exists (select 1 from sys.indexes where name = 'ix_procedures_target_roles' and object_id = object_id('dbo.procedures'))
begin
  create index ix_procedures_target_roles on dbo.procedures(target_roles) include(created_at);
end;
