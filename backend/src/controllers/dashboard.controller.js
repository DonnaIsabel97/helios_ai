import pool from "../db/connection.js";

export const getDashboardSummary = async (req, res, next) => {
  try {
    const usersResult = await pool.query("SELECT COUNT(*) AS count FROM users");
    const fraudCasesResult = await pool.query(
      "SELECT COUNT(*) AS count FROM fraud_cases"
    );
    const creditCasesResult = await pool.query(
      "SELECT COUNT(*) AS count FROM credit_cases"
    );
    const fraudPredictionsResult = await pool.query(
      "SELECT COUNT(*) AS count FROM fraud_predictions"
    );
    const creditPredictionsResult = await pool.query(
      "SELECT COUNT(*) AS count FROM credit_predictions"
    );

    res.status(200).json({
      total_users: Number(usersResult.rows[0].count),
      total_fraud_cases: Number(fraudCasesResult.rows[0].count),
      total_credit_cases: Number(creditCasesResult.rows[0].count),
      total_fraud_predictions: Number(fraudPredictionsResult.rows[0].count),
      total_credit_predictions: Number(creditPredictionsResult.rows[0].count),
    });
  } catch (error) {
    next(error);
  }
};