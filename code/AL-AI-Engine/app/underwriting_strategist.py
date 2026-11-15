
"""Indicative Underwriting Strategist for the academic prototype.

This is a demonstration rules engine, not a real lending decision.
"""


class UnderwritingStrategist:
    """Combines affordability and market indicators into an indicative result."""

    def run(
        self,
        affordability: dict,
        market_macro: dict,
    ) -> dict:

        dti = affordability["debt_to_income_percent"]
        housing_supply = market_macro["housing_supply"]

        # Simple illustrative rules, not official lending criteria.
        if dti > 40:
            recommendation = "DECLINE"
            risk_tier = "HIGH"
            reasoning = (
                "The demonstration DTI exceeds the prototype's "
                "40% threshold."
            )

        elif dti > 30:
            recommendation = "CONDITIONALLY_APPROVE"
            risk_tier = "MEDIUM"
            reasoning = (
                "The demonstration DTI falls within the prototype's "
                "conditional assessment range."
            )

        else:
            recommendation = "APPROVE"
            risk_tier = "LOW"
            reasoning = (
                "The demonstration DTI is within the prototype's "
                "lower-risk range."
            )

        # Add a market context warning without changing the DTI decision.
        if housing_supply == "TIGHT":
            reasoning += (
                " The sample market data also indicates tight housing supply."
            )

        return {
            "recommendation": recommendation,
            "risk_tier": risk_tier,
            "reasoning": reasoning,
            "assessment_type": "INDICATIVE_DEMO_ONLY",
            "is_lending_decision": False,
        }
