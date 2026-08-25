if not exists (
  select 1
  from sys.indexes
  where name = N'IX_Tasks_Establishment_Status_Open'
    and object_id = object_id(N'dbo.tasks')
)
begin
  create index IX_Tasks_Establishment_Status_Open
  on dbo.tasks (establishment_id, status)
  include (task_type, due_date, assigned_to, priority, created_at)
  where status <> N'completada' and status <> N'cancelada';
end;
