
from app.agents import AssessmentCoordinator


def test_all_four_agents():
    coordinator = AssessmentCoordinator()

    result = coordinator.run(
        {
            "county": "Kerry",
            "asking_price_eur": 250000,
        },
        {
            "annual_gross_income": 65000,
            "annual_debt_repayments": 12000,
            "deposit_eur": 50000,
            "principal_eur": 200000,
            "mortgage_term_years": 30,
            "mortgage_interest_rate_percent": 3.6,
            "first_time_buyer": True,
        },
    )

    assert result["valuation"]["valuation_status"] == "DEMO_ONLY"

    assert result["underwriting"]["recommendation"] == "CONDITIONALLY_APPROVE"
    assert result["underwriting"]["riskTier"] == "MEDIUM"
    assert result["underwriting"]["is_lending_decision"] is False

    assert result["marketMacro"]["stressed_interest_rate_percent"] == 5.6
    assert result["marketMacro"]["verdict"] in ["PASS", "FAIL"]

    assert len(result["agents"]) == 4
    assert result["agents"][2]["agentName"] == "Market & Macro Agent"
    assert result["agents"][3]["agentName"] == "Underwriting Strategist"

    assert result["underwriting"]["ltv_percent"] == 80.0
    assert result["underwriting"]["loan_to_income_multiple"] == 3.08
