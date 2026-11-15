
"""Market and Macro Agent using illustrative sample data.

All figures are fictional demonstration inputs, not live Irish statistics.
"""


class MarketMacroAgent:
    """Produces a transparent demonstration of market conditions."""

    def run(self, property_details: dict) -> dict:
        county = property_details.get("county", "Unknown")

        # Illustrative sample inputs only.
        sample_data = {
            "annual_house_price_growth_percent": 5.2,
            "housing_supply": "TIGHT",
            "annual_housing_completions": 32000,
            "average_mortgage_rate_percent": 3.6,
            "unemployment_rate_percent": 4.5,
        }

        return {
            "county_assessed": county,
            "market_outlook": "MODERATE",
            "regional_market_trend": "RISING",
            "housing_supply": sample_data["housing_supply"],
            "mortgage_rate_environment": "MODERATE",
            "economic_conditions": "STABLE",
            "sample_indicators": sample_data,
            "reasoning": (
                "This demonstration assessment uses illustrative figures "
                "for house price growth, housing supply, mortgage rates "
                "and unemployment. These are not verified market statistics."
            ),
            "data_status": "DEMO_SAMPLE_DATA_NOT_LIVE",
        }
