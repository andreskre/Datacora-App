const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..", "..");
const sqlDir = path.resolve(__dirname, "..", "sql");

function loadWindowArray(relativePath, propertyName) {
  const code = fs.readFileSync(path.join(root, relativePath), "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(code, context, { filename: relativePath });
  return Array.isArray(context.window[propertyName]) ? context.window[propertyName] : [];
}

function sqlString(value) {
  if (value === null || value === undefined || value === "") return "null";
  return `N'${String(value).replace(/'/g, "''")}'`;
}

function sqlDecimal(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(7) : "null";
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function writeFile(name, content) {
  fs.writeFileSync(path.join(sqlDir, name), `\uFEFF${content.replace(/\n/g, "\r\n")}`, "utf8");
  console.log(`generated ${name}`);
}

function generateArticleSchema() {
  writeFile("003_add_article_catalog.sql", `use DBDATACORA;
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
`);
}

function generateEstablishmentsSeed(establishments) {
  const insertBlocks = chunks(establishments, 750).map((block) => {
    const values = block.map((item) => {
      const coordinates = item.coordinates || {};
      return `(${[
        sqlString(item.rbd),
        sqlString(item.name),
        sqlString(item.comuna),
        sqlString(item.institutionType),
        sqlString(item.address),
        sqlString(item.branch),
        sqlDecimal(coordinates.lat),
        sqlDecimal(coordinates.lng)
      ].join(", ")})`;
    }).join(",\n  ");

    return `insert into #seed_establishments (rbd, name, commune, institution_type, address, branch_name, latitude, longitude)
values
  ${values};`;
  }).join("\n\n");

  writeFile("004_seed_establishments.sql", `use DBDATACORA;
go

set xact_abort on;
begin transaction;

create table #seed_establishments (
  rbd nvarchar(30) not null,
  name nvarchar(250) not null,
  commune nvarchar(120) null,
  institution_type nvarchar(120) null,
  address nvarchar(300) null,
  branch_name nvarchar(120) null,
  latitude decimal(10,7) null,
  longitude decimal(10,7) null
);

${insertBlocks}

merge dbo.branches as target
using (
  select distinct branch_name as name
  from #seed_establishments
  where branch_name is not null and ltrim(rtrim(branch_name)) <> ''
) as source
on target.name = source.name
when matched then update set is_active = 1
when not matched then insert (name, is_active) values (source.name, 1);

merge dbo.establishments as target
using (
  select
    seed.rbd,
    seed.name,
    seed.commune,
    seed.institution_type,
    seed.address,
    branch.id as branch_id,
    seed.latitude,
    seed.longitude
  from #seed_establishments seed
  left join dbo.branches branch on branch.name = seed.branch_name
) as source
on target.rbd = source.rbd
when matched then update set
  name = source.name,
  commune = source.commune,
  institution_type = source.institution_type,
  address = source.address,
  branch_id = source.branch_id,
  latitude = source.latitude,
  longitude = source.longitude
when not matched then insert (
  rbd,
  name,
  commune,
  institution_type,
  address,
  branch_id,
  latitude,
  longitude
) values (
  source.rbd,
  source.name,
  source.commune,
  source.institution_type,
  source.address,
  source.branch_id,
  source.latitude,
  source.longitude
);

commit transaction;
go
`);
}

function generateArticlesSeed(articles) {
  const insertBlocks = chunks(articles, 900).map((block) => {
    const values = block.map((item) => `(${sqlString(item.id)}, ${sqlString(item.name)})`).join(",\n  ");
    return `insert into #seed_articles (id, name)
values
  ${values};`;
  }).join("\n\n");

  writeFile("005_seed_articles.sql", `use DBDATACORA;
go

set xact_abort on;
begin transaction;

if object_id(N'dbo.article_catalog', N'U') is null
begin
  throw 50000, 'Ejecuta primero 003_add_article_catalog.sql.', 1;
end;

create table #seed_articles (
  id nvarchar(50) not null,
  name nvarchar(300) not null
);

${insertBlocks}

merge dbo.article_catalog as target
using #seed_articles as source
on target.id = source.id
when matched then update set
  name = source.name,
  is_active = 1,
  updated_at = sysdatetimeoffset()
when not matched then insert (id, name, is_active)
  values (source.id, source.name, 1);

update dbo.article_catalog
set is_active = 0,
    updated_at = sysdatetimeoffset()
where not exists (
  select 1
  from #seed_articles source
  where source.id = dbo.article_catalog.id
);

commit transaction;
go
`);
}

function generateViews() {
  writeFile("006_reporting_views.sql", `use DBDATACORA;
go

create or alter view dbo.vw_datacora_tasks as
select
  task.id as [ID Tarea],
  task.task_type as [Tipo tarea],
  task.status as [Estado tarea],
  task.priority as [Prioridad],
  task.sync_state as [Estado sincronizacion],
  task.assigned_at as [Fecha asignacion],
  task.due_date as [Fecha vencimiento],
  establishment.rbd as [RBD],
  establishment.name as [Establecimiento],
  establishment.commune as [Comuna],
  establishment.address as [Direccion],
  branch.name as [Sucursal],
  technician.full_name as [Tecnico],
  technician.email as [Correo tecnico],
  assigner.full_name as [Asignado por]
from dbo.tasks task
join dbo.establishments establishment on establishment.id = task.establishment_id
left join dbo.branches branch on branch.id = establishment.branch_id
left join dbo.profiles technician on technician.id = task.assigned_to
left join dbo.profiles assigner on assigner.id = task.assigned_by;
go

create or alter view dbo.vw_datacora_submissions as
select
  submission.id as [ID Formulario],
  submission.folio as [Folio],
  submission.status as [Estado formulario],
  submission.submitted_at as [Fecha envio],
  submission.synced_at as [Fecha sincronizacion],
  task.id as [ID Tarea],
  task.task_type as [Tipo tarea],
  establishment.rbd as [RBD],
  establishment.name as [Establecimiento],
  establishment.commune as [Comuna],
  establishment.address as [Direccion],
  branch.name as [Sucursal],
  technician.full_name as [Tecnico],
  technician.email as [Correo tecnico]
from dbo.form_submissions submission
join dbo.tasks task on task.id = submission.task_id
join dbo.establishments establishment on establishment.id = task.establishment_id
left join dbo.branches branch on branch.id = establishment.branch_id
left join dbo.profiles technician on technician.id = submission.technician_id;
go

create or alter view dbo.vw_datacora_answers_long as
select
  submission.id as [ID Formulario],
  submission.folio as [Folio],
  submission.submitted_at as [Fecha envio],
  task.task_type as [Tipo tarea],
  establishment.rbd as [RBD],
  establishment.name as [Establecimiento],
  branch.name as [Sucursal],
  section.code as [Codigo seccion],
  section.title as [Seccion],
  item.item_index as [Numero elemento],
  item.item_label as [Etiqueta elemento],
  question.code as [Codigo pregunta],
  question.label as [Pregunta],
  answer.answer_type as [Tipo respuesta],
  coalesce(
    answer.answer_text,
    convert(nvarchar(100), answer.answer_number),
    convert(nvarchar(30), answer.answer_date, 23),
    case when answer.answer_boolean = 1 then N'Si' when answer.answer_boolean = 0 then N'No' end,
    answer.answer_json
  ) as [Respuesta]
from dbo.form_answers answer
join dbo.form_submissions submission on submission.id = answer.submission_id
join dbo.tasks task on task.id = submission.task_id
join dbo.establishments establishment on establishment.id = task.establishment_id
left join dbo.branches branch on branch.id = establishment.branch_id
join dbo.form_sections section on section.id = answer.section_id
join dbo.form_questions question on question.id = answer.question_id
left join dbo.response_items item on item.id = answer.response_item_id;
go

create or alter view dbo.vw_datacora_attachments as
select
  attachment.id as [ID Adjunto],
  attachment.submission_id as [ID Formulario],
  submission.folio as [Folio],
  task.task_type as [Tipo tarea],
  establishment.rbd as [RBD],
  establishment.name as [Establecimiento],
  branch.name as [Sucursal],
  attachment.file_kind as [Tipo archivo],
  attachment.storage_provider as [Proveedor almacenamiento],
  attachment.file_name as [Nombre archivo],
  attachment.mime_type as [Tipo MIME],
  attachment.external_url as [URL externa],
  attachment.external_id as [ID externo],
  attachment.created_at as [Fecha creacion],
  json_value(attachment.metadata, '$.section') as [Seccion],
  json_value(attachment.metadata, '$.element') as [Elemento],
  json_value(attachment.metadata, '$.site') as [Sitio],
  json_value(attachment.metadata, '$.action') as [Accion]
from dbo.form_attachments attachment
join dbo.form_submissions submission on submission.id = attachment.submission_id
join dbo.tasks task on task.id = submission.task_id
join dbo.establishments establishment on establishment.id = task.establishment_id
left join dbo.branches branch on branch.id = establishment.branch_id;
go
`);
}

function main() {
  const establishments = loadWindowArray("src/establishments.generated.js", "DatacoraEstablishments");
  const articles = loadWindowArray("src/articles.generated.js", "DatacoraArticles");
  if (!establishments.length) throw new Error("No se encontraron establecimientos.");
  if (!articles.length) throw new Error("No se encontraron articulos.");

  generateArticleSchema();
  generateEstablishmentsSeed(establishments);
  generateArticlesSeed(articles);
  generateViews();
  console.log(`establishments=${establishments.length}`);
  console.log(`articles=${articles.length}`);
}

main();
