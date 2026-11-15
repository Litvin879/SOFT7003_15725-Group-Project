
# AI Engine

## Overview

The AI Engine is a deterministic Python prototype for the Irish Property Valuation and Affordability project.

It uses four coordinated agents to produce an indicative property assessment. The system is an academic prototype and does not provide professional valuations, mortgage offers or lending decisions.

## Technology Stack

- Python
- FastAPI
- Pydantic
- Firebase Firestore
- Pytest

## Agents

### 1. Property Valuation Agent

Returns a fixed demonstration property value of €250,000.

This is a placeholder and is not based on comparable property sales or a trained valuation model.

### 2. Affordability Agent

Calculates:
- Annual and monthly gross income
- Annual and monthly existing debt repayments
- Debt-to-income indicator
- Deposit
- Mortgage term

It does not approve lending.

### 3. Market & Macro Agent

Performs an indicative mortgage interest-rate stress test.

It:
- Calculates the current monthly mortgage repayment.
- Increases the interest rate by two percentage points.
- Calculates the stressed monthly repayment.
- Recalculates DTI including existing debt repayments.
- Checks whether stressed DTI remains below 40%.

The calculation uses the financial information supplied with the application. It does not retrieve live market data.

### 4. Underwriting Strategist

Applies the project's proposed assessment rules.

**Decline / High risk**
- LTV above 90%.
- Loan-to-income above 4 times gross income for first-time buyers.
- Loan-to-income above 3.5 times gross income for other buyers.
- DTI including the new mortgage repayment above 40%.

**Conditionally Approve / Medium risk**
- LTV between 80% and 90%.
- DTI between 35% and 40%.
- Asking price more than 5% above the estimated valuation.

**Approve / Low risk**
- None of the above conditions are triggered.

These are prototype assessment rules and should not be represented as an official lending decision or as a complete statement of Central Bank regulations.

## API and Firestore Integration

The FastAPI endpoint:

`POST /applications/assess`

Reads an application from Firestore, validates its property and financial details, runs the four agents and saves the assessment under `aiAssessment`.

The application status is updated to:

`AI Deliberated`

The assessment includes:
- `valuation`
- `affordability`
- `marketMacro`
- `underwriting`
- `recommendation`
- `riskTier`
- `agents`

Each agent entry contains its name, verdict and reasoning.

## Required Input Fields

Property details:
- `town`
- `county`
- `bedrooms`
- `propertyType`
- `berRating`
- `floorAreaSqm`
- `askingPriceEuro`

Financial details:
- `annualIncome`
- `monthlyDebtRepayments`
- `depositEuro`
- `mortgageTermYears`
- `principalEuro`
- `mortgageInterestRatePercent`
- `firstTimeBuyer`

The mobile application must supply the additional fields required by the updated API.

## Testing

Run the integration test from the AI Engine directory:

```bash
python -m pytest ../../tests/test_ai_agents.py -v
```

The test checks the four-agent coordinator, underwriting outputs and interest-rate stress test.

## Limitations

- The property valuation is a fixed demonstration value.
- The interest-rate stress test uses the rate supplied with the application.
- No live property market or economic data is retrieved.
- Underwriting thresholds are prototype rules.
- The output is indicative only and is not a mortgage approval or professional financial advice.
