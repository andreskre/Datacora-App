require("dotenv").config();

const { pool, sql } = require("../src/lib/db");

async function main() {
  const db = await pool();
  const result = await db.request().query(`
    select top 20
      submission.folio,
      submission.submitted_at as submittedAt,
      task.task_type as taskType,
      establishment.rbd,
      establishment.name as establishmentName,
      section.code as sectionCode,
      question.code as questionCode,
      answer.answer_text as answerText,
      convert(nvarchar(100), answer.answer_number) as answerNumber
    from dbo.form_answers answer
    join dbo.form_submissions submission on submission.id = answer.submission_id
    join dbo.tasks task on task.id = submission.task_id
    join dbo.establishments establishment on establishment.id = task.establishment_id
    join dbo.form_sections section on section.id = answer.section_id
    join dbo.form_questions question on question.id = answer.question_id
    where section.code = 'geolocation'
    order by submission.submitted_at desc, question.sort_order asc
  `);

  const countResult = await db.request().query(`
    select
      count(distinct submission.id) as submissionsWithGeolocation,
      count(*) as geolocationAnswers
    from dbo.form_answers answer
    join dbo.form_submissions submission on submission.id = answer.submission_id
    join dbo.form_sections section on section.id = answer.section_id
    where section.code = 'geolocation'
  `);

  console.log(JSON.stringify({
    database: process.env.SQLSERVER_DATABASE || "DBDATACORA",
    summary: countResult.recordset[0],
    sample: result.recordset
  }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
