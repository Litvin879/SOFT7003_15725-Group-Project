
"""Coordinates the four deterministic agents in the academic prototype."""

from dataclasses import dataclass
from typing import Any

from .market_macro_agent import MarketMacroAgent
from .underwriting_strategist import UnderwritingStrategist


@dataclass
class ValuationResult:
    estimated_value_eur: float
    valuation_status: str
    explanation: str
    is_demo_estimate: bool


class PropertyValuationAgent:
    """Temporary demonstration agent; not a real property valuation."""

    def run(self, property_details: dict[str, Any]) -> ValuationResult:
        return ValuationResult(
            estimated_value_eur=250000.0,
            valuation_status="DEMO_ONLY",
            explanation=(
                "A fixed demonstration value is being returned. It is not "
                "based on comparable sales, a trained model, or a "
                "professional valuation."
            ),
            is_demo_estimate=True,
        )


class AffordabilityAgent:
    """Calculates affordability indicators; does not approve lending."""

    def run(self, finances: dict[str, Any]) -> dict[str, Any]:
        annual_income = float(finances["annual_gross_income"])
        annual_debt = float(finances["annual_debt_repayments"])

        if annual_income <= 0:
            raise ValueError("Annual income must be greater than zero.")

        dti = (annual_debt / annual_income) * 100.0

        return {
            "annual_gross_income_eur": round(annual_income, 2),
            "annual_debt_repayments_eur": round(annual_debt, 2),
            "monthly_gross_income_eur": round(annual_income / 12.0, 2),
            "monthly_debt_repayments_eur": round(annual_debt / 12.0, 2),
            "debt_to_income_percent": round(dti, 2),
            "deposit_eur": round(float(finances["deposit_eur"]), 2),
            "mortgage_term_years": int(finances["mortgage_term_years"]),
            "assessment_status": "CALCULATED_NOT_APPROVED",
            "notice": (
                "This is an indicative calculation only. It is not a "
                "mortgage offer, credit decision, or lending approval."
            ),
        }


class AssessmentCoordinator:
    """Runs all four agents and combines their outputs."""

    def __init__(self) -> None:
        self.valuation_agent = PropertyValuationAgent()
        self.affordability_agent = AffordabilityAgent()
        self.market_macro_agent = MarketMacroAgent()
        self.underwriting_agent = UnderwritingStrategist()

    def run(
        self,
        property_details: dict[str, Any],
        finances: dict[str, Any],
    ) -> dict[str, Any]:

        # Run the original agents.
        valuation = self.valuation_agent.run(property_details)
        affordability = self.affordability_agent.run(finances)

        # Run the two new agents.
        market_macro = self.market_macro_agent.run(property_details)
        underwriting = self.underwriting_agent.run(
            affordability=affordability,
            market_macro=market_macro,
        )

        return {
            "valuation": {
                "estimated_value_eur": valuation.estimated_value_eur,
                "valuation_status": valuation.valuation_status,
                "explanation": valuation.explanation,
                "is_demo_estimate": valuation.is_demo_estimate,
            },
            "affordability": affordability,
            "marketMacro": market_macro,
            "underwriting": underwriting,
        }
