from app.agents import AssessmentCoordinator


def test_all_four_agents():
    coordinator = AssessmentCoordinator()

    result = coordinator.run(
        {"county": "Kerry"},
        {
            "annual_gross_income": 65000,
            "annual_debt_repayments": 12000,
            "deposit_eur": 35000,
            "mortgage_term_years": 30,
        },
    )

    assert result["affordability"]["debt_to_income_percent"] == 18.46
    assert result["valuation"]["valuation_status"] == "DEMO_ONLY"
    assert result["marketMacro"]["data_status"] == "DEMO_SAMPLE_DATA_NOT_LIVE"
    assert result["underwriting"]["recommendation"] == "APPROVE"
    assert result["underwriting"]["is_lending_decision"] is False