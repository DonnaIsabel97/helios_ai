import { resolveMonthlyDebt } from "../utils/monthlyDebt.js";
import { runCreditScenario } from "../utils/runCreditScenario.js";
import pool from "../db/connection.js";

export async function getCreditDetails(req, res, next) {

 try {

  const prediction = await pool.query(`SELECT cp.created_at, la.annual_income FROM credit_predictions cp
    LEFT JOIN loan_applications la ON la.id::text=COALESCE(cp.loan_application_id::text,cp.application_id) AND la.customer_id=cp.customer_id WHERE cp.id=$1`, [req.params.id]);

  if (!prediction.rows.length) return res.status(404).json({message:"Application not found."});

  const review = await pool.query("SELECT *, updated_at::text AS version FROM credit_cases WHERE credit_prediction_id=$1", [req.params.id]);

  const user = await pool.query("SELECT role FROM users WHERE id=$1", [req.user.id]);

  const activity = review.rows[0] ? await pool.query("SELECT * FROM credit_case_activity WHERE credit_case_id=$1 ORDER BY created_at DESC,id DESC", [review.rows[0].id]) : {rows:[]};

  res.set("Cache-Control","no-store");

  res.json({annual_income:prediction.rows[0].annual_income, review_case:review.rows[0] || null, activity:activity.rows, prediction_created_at:prediction.rows[0].created_at, can_update:user.rows[0]?.role.toLowerCase()==="admin"});

 } catch(error) { next(error); }

}

// Save the case and audit event atomically; reject stale updates from another reviewer.

export async function updateCreditCase(req,res,next) {

 const {action,version,notes,simulation,annual_income}=req.body || {};

 if (!['approve','reject','escalate','save_notes','save_simulation','save_income'].includes(action) || typeof version!=='string') return res.status(400).json({message:'Invalid action or missing case version.'});

 let client;

 try {

  client=await pool.connect(); await client.query('BEGIN');

  const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};

  const user=(await client.query('SELECT role,full_name FROM users WHERE id=$1',[req.user.id])).rows[0];

  if(user?.role.toLowerCase()!=='admin') fail('Only an Admin can update credit cases.',403);

  const current=(await client.query('SELECT *,updated_at::text AS version FROM credit_cases WHERE credit_prediction_id=$1 FOR UPDATE',[req.params.id])).rows[0];

  if(!current) fail('No review case exists for this application.',404);

  if(current.version!==version) fail('This case changed. Close and reopen it before saving.',409);

  let snapshot=null;
  let savedIncome;
  let incomeNote;

  const deciding=['approve','reject','escalate'].includes(action);

  if(deciding && !['open','escalated'].includes(current.status)) fail('This case is already closed.',409);

  if(action==='save_notes' && (typeof notes!=='string' || !notes.trim() || notes.length>10000)) fail('Enter a note between 1 and 10,000 characters.');

  if(action==='save_income') {
   if(typeof annual_income!=='number' || !Number.isFinite(annual_income) || annual_income<0 || annual_income>1e9 || Math.abs(annual_income*100-Math.round(annual_income*100))>1e-5) fail('Enter an annual income from $0 to $1 billion with at most two decimal places.');
   // Keep the application record and its audit event in the same transaction.
   const application=(await client.query(`SELECT la.id,la.annual_income FROM loan_applications la
    JOIN credit_predictions cp ON la.id::text=COALESCE(cp.loan_application_id::text,cp.application_id) AND la.customer_id=cp.customer_id
    WHERE cp.id=$1 FOR UPDATE OF la`,[req.params.id])).rows[0];
   if(!application) fail('Application not found.',404);
   await client.query('UPDATE loan_applications SET annual_income=$1,updated_at=clock_timestamp() WHERE id=$2',[annual_income,application.id]);
   savedIncome=annual_income;
   incomeNote=`Annual income changed from ${application.annual_income == null ? 'not provided' : '$'+Number(application.annual_income).toFixed(2)} to $${annual_income.toFixed(2)}.`;
  }

  if(action==='save_simulation') {

   const amount=simulation?.loan_amount, duration=simulation?.duration_months;
   const income=simulation?.annual_income;
   const debt=resolveMonthlyDebt(simulation);
   const monthlyDebt=debt.amount;
   const positive=value=>typeof value==='number' && Number.isFinite(value) && value>0 && value<=1e9;
   if(!positive(amount) || !positive(income) || ![36,60].includes(duration) ||
      typeof monthlyDebt!=='number' || !Number.isFinite(monthlyDebt) || monthlyDebt<0 || monthlyDebt>income/12) {
    fail('Enter a positive loan amount and annual income, choose 36 or 60 months, and enter monthly debt payments no higher than monthly income.');
   }
   const prediction=(await client.query('SELECT risk_probability FROM credit_predictions WHERE id=$1',[req.params.id])).rows[0];
   const base=Number(prediction.risk_probability);
   if(!Number.isFinite(base)) fail('The original risk score is unavailable.');
   // Derive the training feature from the analyst's dollar inputs, not from a fabricated savings value.
   const dti=monthlyDebt*1200/income;
   const result=await runCreditScenario({loan_amount:amount,duration_months:duration,annual_income:income,debt_to_income:dti});
   snapshot={loan_amount:amount,duration_months:duration,annual_income:income,monthly_debt_payments:monthlyDebt,
    monthly_debt_range:debt.range,monthly_debt_range_label:debt.label,monthly_debt_basis:debt.basis,
    debt_to_income:dti,base_risk:base,result_risk:result.risk_probability,predicted_class:result.predicted_class,
    method:'model_usd_v3',model_version:result.model_version,model_sha256:result.model_sha256,
    decision_threshold:result.decision_threshold,raw_probability:result.raw_probability,
    evidence_used:result.evidence_used,amount_unit:result.amount_unit,
    outside_training_range:result.outside_training_range,warnings:result.warnings};
  }

  const decision=action==='approve'?'approved':action==='reject'?'rejected':current.decision;

  const status=action==='escalate'?'escalated':deciding?'closed':current.status;

  const saved=(await client.query(`UPDATE credit_cases SET decision=$1,status=$2,updated_at=clock_timestamp(),

   reviewed_at=CASE WHEN $3 THEN COALESCE(reviewed_at,clock_timestamp()) ELSE reviewed_at END,

   reviewed_by=CASE WHEN $3 AND reviewed_at IS NULL THEN $4::uuid ELSE reviewed_by END

   WHERE id=$5 RETURNING *,updated_at::text AS version`,[decision,status,deciding,req.user.id,current.id])).rows[0];

  const event=(await client.query(`INSERT INTO credit_case_activity(credit_case_id,actor_user_id,actor_name,action,note,simulation,previous_status,new_status,previous_decision,new_decision)

   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[current.id,req.user.id,user.full_name || 'User',action,action==='save_notes'?notes.trim():action==='save_income'?incomeNote:null,snapshot,current.status,status,current.decision,decision])).rows[0];

  await client.query('COMMIT'); res.set('Cache-Control','no-store'); res.json({review_case:saved,activity_event:event,...(savedIncome !== undefined ? {annual_income:savedIncome} : {})});

 } catch(error) {

  if(client) await client.query('ROLLBACK').catch(()=>{});

  if(error.status) return res.status(error.status).json({message:error.message});

  next(error);

 } finally {client?.release();}

}

