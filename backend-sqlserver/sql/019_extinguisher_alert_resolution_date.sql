if object_id(N'dbo.maintenance_alerts', N'U') is not null
begin
  if col_length(N'dbo.maintenance_alerts', N'replacement_expiration_date') is null
  begin
    alter table dbo.maintenance_alerts
    add replacement_expiration_date date null;
  end;

  if col_length(N'dbo.maintenance_alerts', N'resolved_days_to_expire') is null
  begin
    alter table dbo.maintenance_alerts
    add resolved_days_to_expire int null;
  end;
end;
