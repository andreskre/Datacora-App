if object_id(N'dbo.maintenance_alerts', N'U') is null
begin
  create table dbo.maintenance_alerts (
    id uniqueidentifier not null constraint DF_maintenance_alerts_id default newid(),
    alert_type nvarchar(80) not null,
    status nvarchar(40) not null constraint DF_maintenance_alerts_status default N'pendiente',
    severity nvarchar(40) not null constraint DF_maintenance_alerts_severity default N'media',
    branch_id uniqueidentifier not null,
    establishment_id uniqueidentifier not null,
    task_id uniqueidentifier null,
    submission_id uniqueidentifier null,
    reported_by uniqueidentifier null,
    resolved_by uniqueidentifier null,
    title nvarchar(250) not null,
    body nvarchar(max) null,
    due_date date null,
    days_to_expire int null,
    replacement_expiration_date date null,
    resolved_days_to_expire int null,
    metadata nvarchar(max) null,
    resolved_at datetimeoffset null,
    created_at datetimeoffset not null constraint DF_maintenance_alerts_created_at default sysdatetimeoffset(),
    updated_at datetimeoffset not null constraint DF_maintenance_alerts_updated_at default sysdatetimeoffset(),
    constraint PK_maintenance_alerts primary key (id),
    constraint FK_maintenance_alerts_branch foreign key (branch_id) references dbo.branches(id),
    constraint FK_maintenance_alerts_establishment foreign key (establishment_id) references dbo.establishments(id),
    constraint FK_maintenance_alerts_task foreign key (task_id) references dbo.tasks(id),
    constraint FK_maintenance_alerts_submission foreign key (submission_id) references dbo.form_submissions(id),
    constraint FK_maintenance_alerts_reported_by foreign key (reported_by) references dbo.profiles(id),
    constraint FK_maintenance_alerts_resolved_by foreign key (resolved_by) references dbo.profiles(id)
  );
end;

if not exists (
  select 1
  from sys.indexes
  where object_id = object_id(N'dbo.maintenance_alerts')
    and name = N'IX_maintenance_alerts_branch_status_created'
)
begin
  create index IX_maintenance_alerts_branch_status_created
  on dbo.maintenance_alerts (branch_id, status, created_at desc);
end;

if not exists (
  select 1
  from sys.indexes
  where object_id = object_id(N'dbo.maintenance_alerts')
    and name = N'IX_maintenance_alerts_submission_type'
)
begin
  create index IX_maintenance_alerts_submission_type
  on dbo.maintenance_alerts (submission_id, alert_type);
end;
