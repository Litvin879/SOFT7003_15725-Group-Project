package com.example.agenticlender

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.agenticlender.ui.theme.AgenticLenderTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            AgenticLenderTheme {
                AgenticLenderApp()
            }
        }
    }
}

@Composable
fun AgenticLenderApp() {

    var currentScreen by remember { mutableStateOf("financial") }

    when (currentScreen) {

        "financial" -> FinancialDetailsScreen(
            onContinue = {
                currentScreen = "property"
            }
        )

        "property" -> PropertyDetailsScreen(
            onSubmit = {
                currentScreen = "status"
            }
        )

        "status" -> ApplicationStatusScreen()
    }
}

@Composable
fun FinancialDetailsScreen(onContinue: () -> Unit) {

    var annualIncome by remember { mutableStateOf("") }
    var existingDebt by remember { mutableStateOf("") }
    var depositAmount by remember { mutableStateOf("") }
    var mortgageTerm by remember { mutableStateOf("") }

    var showError by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {

        Text("Agentic Lender", fontSize = 28.sp)

        Spacer(modifier = Modifier.height(8.dp))

        Text("Borrower Financial Details", fontSize = 20.sp)

        Spacer(modifier = Modifier.height(30.dp))

        OutlinedTextField(
            value = annualIncome,
            onValueChange = { annualIncome = it },
            label = { Text("Annual Gross Income (€)") },
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = existingDebt,
            onValueChange = { existingDebt = it },
            label = { Text("Existing Debt (€)") },
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = depositAmount,
            onValueChange = { depositAmount = it },
            label = { Text("Deposit Amount (€)") },
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = mortgageTerm,
            onValueChange = { mortgageTerm = it },
            label = { Text("Mortgage Term (Years)") },
            modifier = Modifier.fillMaxWidth()
        )

        if (showError) {
            Spacer(modifier = Modifier.height(8.dp))

            Text(
                "Please complete all fields.",
                color = MaterialTheme.colorScheme.error
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = {
                if (
                    annualIncome.isBlank() ||
                    existingDebt.isBlank() ||
                    depositAmount.isBlank() ||
                    mortgageTerm.isBlank()
                ) {
                    showError = true
                } else {
                    showError = false
                    onContinue()
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Continue")
        }
    }
}

@Composable
fun PropertyDetailsScreen(onSubmit: () -> Unit) {

    var county by remember { mutableStateOf("") }
    var propertySize by remember { mutableStateOf("") }
    var bedrooms by remember { mutableStateOf("") }
    var propertyType by remember { mutableStateOf("") }
    var berRating by remember { mutableStateOf("") }

    var showError by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {

        Text("Agentic Lender", fontSize = 28.sp)

        Spacer(modifier = Modifier.height(8.dp))

        Text("Property Details", fontSize = 20.sp)

        Spacer(modifier = Modifier.height(30.dp))

        OutlinedTextField(
            value = county,
            onValueChange = { county = it },
            label = { Text("Location / County") },
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = propertySize,
            onValueChange = { propertySize = it },
            label = { Text("Property Size (m²)") },
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = bedrooms,
            onValueChange = { bedrooms = it },
            label = { Text("Bedrooms") },
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = propertyType,
            onValueChange = { propertyType = it },
            label = { Text("Property Type") },
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = berRating,
            onValueChange = { berRating = it },
            label = { Text("BER Rating") },
            modifier = Modifier.fillMaxWidth()
        )

        if (showError) {
            Spacer(modifier = Modifier.height(8.dp))

            Text(
                "Please complete all property fields.",
                color = MaterialTheme.colorScheme.error
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = {
                if (
                    county.isBlank() ||
                    propertySize.isBlank() ||
                    bedrooms.isBlank() ||
                    propertyType.isBlank() ||
                    berRating.isBlank()
                ) {
                    showError = true
                } else {
                    showError = false
                    onSubmit()
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Submit Application")
        }
    }
}

@Composable
fun ApplicationStatusScreen() {

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {

        Text("Agentic Lender", fontSize = 28.sp)

        Spacer(modifier = Modifier.height(8.dp))

        Text("Application Status", fontSize = 20.sp)

        Spacer(modifier = Modifier.height(32.dp))

        Text("Current Status", fontSize = 16.sp)

        Text(
            "AI Review",
            fontSize = 24.sp
        )

        Spacer(modifier = Modifier.height(30.dp))

        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(20.dp)
            ) {
                Text("Loan to Value (LTV): 82%")
                Spacer(modifier = Modifier.height(12.dp))

                Text("Debt to Income (DTI): 3.2")
                Spacer(modifier = Modifier.height(12.dp))

                Text("Approval Likelihood: Pending")
            }
        }

        Spacer(modifier = Modifier.height(30.dp))

        Text("Application Progress", fontSize = 18.sp)

        Spacer(modifier = Modifier.height(16.dp))

        Text("✓ Applied")
        Text("→ AI Review")
        Text("○ Underwriter Review")
        Text("○ Approved")
    }
}