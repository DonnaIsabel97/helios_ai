// Resolve ranges on the server so a browser cannot alter the midpoint or audit label.
const ranges = {
  none: {label:"$0 — No debt payments", amount:0},
  "1_500": {label:"$1–$500", amount:250.5},
  "501_1000": {label:"$501–$1,000", amount:750.5},
  "1001_1500": {label:"$1,001–$1,500", amount:1250.5},
  "1501_2000": {label:"$1,501–$2,000", amount:1750.5},
};
export function resolveMonthlyDebt(simulation) {
  const choice=simulation?.monthly_debt_range;
  // Accept older clients supplying an exact amount without a range.
  if(choice === undefined || choice === "custom") {
    const amount=simulation?.monthly_debt_payments;
    if(typeof amount !== "number" || !Number.isFinite(amount) || amount<0) {
      throw Object.assign(new Error("Enter a valid monthly debt amount."),{status:400});
    }
    return {amount,range:"custom",label:"Custom amount",basis:"exact"};
  }
  if(typeof choice !== "string" || !Object.hasOwn(ranges,choice)) {
    throw Object.assign(new Error("Choose a monthly debt range."),{status:400});
  }
  return {...ranges[choice],range:choice,basis:choice === "none" ? "exact" : "midpoint"};
}
