
"""Rule-based underwriting assessment for the academic prototype."""


class UnderwritingStrategist:
    """Applies the project's indicative underwriting rules."""

    @staticmethod
    def _monthly_repayment(principal, annual_rate_percent, term_years):
        if principal <= 0 or term_years <= 0:
            raise ValueError("Loan amount and mortgage term must be positive.")

        monthly_rate = annual_rate_percent / 100 / 12
        months = term_years * 12

        if monthly_rate == 0:
            return principal / months

        return (
            principal * monthly_rate
            / (1 - (1 + monthly_rate) ** -months)
        )

    def run(self, property_details, finances, estimated_value_eur):
        asking_price = float(property_details["asking_price_eur"])
        income = float(finances["annual_gross_income"])
        existing_debt = float(finances["annual_debt_repayments"])
        loan = float(finances["principal_eur"])
        term = int(finances["mortgage_term_years"])
        interest_rate = float(finances["mortgage_interest_rate_percent"])
        first_time_buyer = bool(finances["first_time_buyer"])

        if income <= 0 or estimated_value_eur <= 0:
            raise ValueError("Income and property valuation must be positive.")

        # LTV uses the estimated property valuation.
        ltv = loan / estimated_value_eur * 100

        # Loan-to-income limit depends on first-time buyer status.
        lti = loan / income
        lti_limit = 4.0 if first_time_buyer else 3.5

        # Include the new mortgage repayment in DTI.
        monthly_mortgage = self._monthly_repayment(
            loan, interest_rate, term
        )
        annual_total_debt = existing_debt + monthly_mortgage * 12
        dti = annual_total_debt / income * 100

        overvaluation = (
            asking_price > estimated_value_eur * 1.05
        )

        decline_reasons = []
        conditional_reasons = []

        if ltv > 90:
            decline_reasons.append("LTV exceeds 90%.")

        if lti > lti_limit:
            decline_reasons.append(
                f"Loan-to-income exceeds {lti_limit}x."
            )

        if dti > 40:
            decline_reasons.append("DTI including the mortgage exceeds 40%.")

        if 80 <= ltv <= 90:
            conditional_reasons.append("LTV is between 80% and 90%.")

        if 35 <= dti <= 40:
            conditional_reasons.append("DTI is between 35% and 40%.")

        if overvaluation:
            conditional_reasons.append(
                "Asking price is more than 5% above the valuation."
            )

        if decline_reasons:
            recommendation = "DECLINE"
            risk_tier = "HIGH"
            reasoning = decline_reasons
        elif conditional_reasons:
            recommendation = "CONDITIONALLY_APPROVE"
            risk_tier = "MEDIUM"
            reasoning = conditional_reasons
        else:
            recommendation = "APPROVE"
            risk_tier = "LOW"
            reasoning = ["None of the prototype warning thresholds were triggered."]

        return {
            "recommendation": recommendation,
            "riskTier": risk_tier,
            "risk_tier": risk_tier,
            "ltv_percent": round(ltv, 2),
            "loan_to_income_multiple": round(lti, 2),
            "dti_percent": round(dti, 2),
            "monthly_mortgage_repayment_eur": round(monthly_mortgage, 2),
            "reasoning": reasoning,
            "assessment_type": "INDICATIVE_DEMO_ONLY",
            "is_lending_decision": False,
        }
