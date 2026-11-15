
"""FastAPI entry point for the Irish Property Valuation prototype."""

import os
import logging
from datetime import datetime, timezone
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, ValidationError, field_validator

from app.agents import AssessmentCoordinator
from app.firebase_config import get_firestore_client

load_dotenv()

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Irish Property Valuation & Affordability API",
    description=(
        "Academic prototype using deterministic Python agents and Firebase "
        "Firestore. The valuation is a demo placeholder, not a market valuation."
    ),
    version="3.0.0",
)

coordinator = AssessmentCoordinator()


# Models matching Sam's Firestore mobile data structure

class PropertyDetails(BaseModel):
    town: str = Field(min_length=1, max_length=100)
    county: str = Field(min_length=1, max_length=100)
    bedrooms: int = Field(ge=1, le=20)
    property_type: Literal[
        "detached_house",
        "semi_detached_house",
        "terraced_house",
        "apartment",
        "bungalow",
    ] = Field(alias="propertyType")
    ber_rating: str = Field(alias="berRating", min_length=1, max_length=10)
    floor_area_sqm: float = Field(alias="floorAreaSqm", gt=0)

    @field_validator("ber_rating")
    @classmethod
    def normalize_ber(cls, value: str) -> str:
        return value.strip().upper()


class FinancialDetails(BaseModel):
    annual_gross_income: float = Field(alias="annualIncome", gt=0)
    monthly_debt_repayments: float = Field(
        alias="monthlyDebtRepayments", ge=0
    )
    deposit_eur: float = Field(alias="depositEuro", ge=0)
    mortgage_term_years: int = Field(
        alias="mortgageTermYears", ge=1, le=40
    )


class AssessmentRequest(BaseModel):
    application_id: str = Field(min_length=1, max_length=100)

    @field_validator("application_id")
    @classmethod
    def validate_application_id(cls, value: str) -> str:
        value = value.strip()
        if not value or "/" in value:
            raise ValueError("Invalid Firestore application document ID")
        return value


@app.get("/health")
def health():
    return {
        "status": "ok",
        "openai_required": False,
        "storage": "Firebase Firestore",
        "collection": os.getenv("FIRESTORE_COLLECTION", "application"),
        "agents": "deterministic Python agents",
    }


@app.post("/applications/assess")
def assess_application(request: AssessmentRequest):
    """Read a mobile application, assess it, and update the same document."""

    try:
        db = get_firestore_client()
        collection = os.getenv("FIRESTORE_COLLECTION", "application")

        document_ref = (
            db.collection(collection)
            .document(request.application_id)
        )

        snapshot = document_ref.get()

    except Exception as exc:
        logger.exception("Firebase application read failed")
        raise HTTPException(
            status_code=503,
            detail="Could not connect to Firebase. Check the server logs.",
        ) from exc

    if not snapshot.exists:
        raise HTTPException(
            status_code=404,
            detail="Application document not found in Firestore.",
        )

    document = snapshot.to_dict() or {}

    # Check that the mobile application contains both expected sections.
    try:
        property_details = PropertyDetails.model_validate(
            document.get("propertyDetails", {})
        )
        financial_details = FinancialDetails.model_validate(
            document.get("financialDetails", {})
        )
    except ValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail={
                "message": (
                    "The Firestore application is missing required fields "
                    "or contains invalid data."
                ),
                "errors": exc.errors(),
            },
        ) from exc

    # Convert mobile data into the field names expected by our agents.
    property_data = property_details.model_dump()
    property_data["location"] = (
        f"{property_data['town']}, County {property_data['county']}"
    )

    finance_data = financial_details.model_dump()
    finance_data["annual_debt_repayments"] = (
        finance_data["monthly_debt_repayments"] * 12
    )

    # Run the valuation and affordability agents.
    assessment = coordinator.run(property_data, finance_data)

    ai_assessment = {
        **assessment,
        "assessmentDate": datetime.now(timezone.utc).isoformat(),
    }

    # Update ONLY the aiAssessment field.
    # Existing propertyDetails and financialDetails remain untouched.
    try:
        document_ref.update({
            "aiAssessment": ai_assessment,
            "status": "AI Deliberated"
        })
    except Exception as exc:
        logger.exception("Firebase assessment update failed")
        raise HTTPException(
            status_code=503,
            detail="Assessment calculated, but saving to Firebase failed.",
        ) from exc

    return {
        "application_id": request.application_id,
        "aiAssessment": ai_assessment,
        "saved_to_firebase": True,
    }


@app.get("/applications/{application_id}")
def get_application(application_id: str):
    """Retrieve an application document from Firestore."""

    try:
        db = get_firestore_client()
        collection = os.getenv("FIRESTORE_COLLECTION", "application")

        snapshot = (
            db.collection(collection)
            .document(application_id)
            .get()
        )

    except Exception as exc:
        logger.exception("Firebase application read failed")
        raise HTTPException(
            status_code=503,
            detail="Could not retrieve the application from Firebase.",
        ) from exc

    if not snapshot.exists:
        raise HTTPException(
            status_code=404,
            detail="Application not found.",
        )

    return snapshot.to_dict()
