
"""Mortgage interest-rate stress testing for the academic prototype."""


class MarketMacroAgent:
    """Checks affordability if mortgage rates increase by 2 percentage points."""

    def run(self, finances):
        principal = float(finances["principal_eur"])
        income = float(finances["annual_gross_income"])
        existing_debt = float(finances["annual_debt_repayments"])
        term = int(finances["mortgage_term_years"])
        current_rate = float(finances["mortgage_interest_rate_percent"])

        if income <= 0:
            raise ValueError("Annual income must be greater than zero.")
        if principal <= 0 or term <= 0:
            raise ValueError("Loan amount and mortgage term must be positive.")

        stressed_rate = current_rate + 2.0

        def monthly_repayment(rate_percent):
            monthly_rate = rate_percent / 100 / 12
            months = term * 12

            if monthly_rate == 0:
                return principal / months

            return (
                principal * monthly_rate
                / (1 - (1 + monthly_rate) ** -months)
            )

        current_monthly = monthly_repayment(current_rate)
        stressed_monthly = monthly_repayment(stressed_rate)

        current_dti = (
            (existing_debt + current_monthly * 12) / income
        ) * 100

        stressed_dti = (
            (existing_debt + stressed_monthly * 12) / income
        ) * 100

        return {
            "current_interest_rate_percent": current_rate,
            "stressed_interest_rate_percent": stressed_rate,
            "current_monthly_mortgage_eur": round(current_monthly, 2),
            "stressed_monthly_mortgage_eur": round(stressed_monthly, 2),
            "current_dti_percent": round(current_dti, 2),
            "stressed_dti_percent": round(stressed_dti, 2),
            "stays_below_40_percent": stressed_dti < 40,
            "verdict": (
                "PASS" if stressed_dti < 40 else "FAIL"
            ),
            "reasoning": (
                "DTI remains below 40% after a 2-percentage-point "
                "interest-rate increase."
                if stressed_dti < 40
                else "DTI reaches or exceeds 40% after a 2-percentage-point "
                "interest-rate increase."
            ),
            "data_status": "CALCULATED_FROM_USER_INPUTS_DEMO_ONLY",
        }
