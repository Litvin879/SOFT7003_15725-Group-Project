# AL-AI-Engine

## Overview

The AL-AI-Engine is the Python backend component of the Agentic Lender academic project. It uses FastAPI, Firebase Firestore and deterministic Python agents to assess property applications.

## Technology Stack

- Python
- FastAPI
- Pydantic
- Firebase Admin SDK
- Google Cloud Firestore
- Uvicorn

## Agents

### Property Valuation Agent
Currently returns a fixed demonstration estimate of €250,000. This is not a professional or market valuation.

### Affordability Agent
Calculates affordability indicators, including annual repayments and debt-to-income ratio (DTI).

### Market & Macro Agent
Uses illustrative sample market indicators to demonstrate market-condition assessment. Sample figures are not live statistics.

### Underwriting Strategist
Change that description to say it is implemented, using prototype thresholds and indicative demo assessments only (not real lending decisions).

## Firestore Integration

The API reads applications from the `application` collection using the Firestore document ID supplied as `application_id`.

It saves assessment results under `aiAssessment` and updates the application status to `AI Deliberated`.

Existing `propertyDetails` and `financialDetails` fields are preserved.

## Running Locally

1. Install the dependencies:

   `pip install -r requirements.txt`

2. Configure Firebase credentials using a local `.env` file.

3. Start the API:

   `python -m uvicorn app.main:app --reload`

4. Open the interactive API documentation:

   `http://127.0.0.1:8000/docs`

## Important Notes

This is an academic prototype. Demonstration valuations, sample market data and affordability calculations are not financial advice, mortgage offers or lending decisions.

Firebase credentials and `.env` files must never be committed to GitHub.