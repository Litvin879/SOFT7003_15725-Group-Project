package com.example.agenticlender

import android.os.Bundle
import android.util.Patterns
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.agenticlender.ui.theme.AgenticLenderTheme
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import java.util.Locale

// Keeps the form values together while the borrower moves between screens.
data class MortgageApplication(
    val annualIncome: Double = 0.0,
    val monthlyDebtRepayments: Double = 0.0,
    val depositAmount: Double = 0.0,
    val mortgageTerm: Int = 0,
    val town: String = "",
    val county: String = "",
    val propertySize: Double = 0.0,
    val bedrooms: Int = 0,
    val propertyType: String = "",
    val berRating: String = ""
)

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
    val auth = remember { FirebaseAuth.getInstance() }
    val firestore = remember { FirebaseFirestore.getInstance() }

    var userUid by remember { mutableStateOf(auth.currentUser?.uid) }
    var currentScreen by rememberSaveable { mutableStateOf("financial") }
    var applicationId by rememberSaveable { mutableStateOf("") }
    var application by remember { mutableStateOf(MortgageApplication()) }

    var isAuthLoading by remember { mutableStateOf(false) }
    var authError by remember { mutableStateOf<String?>(null) }
    var isSubmitting by remember { mutableStateOf(false) }
    var submissionError by remember { mutableStateOf<String?>(null) }

    // Updates the UI when Firebase signs a user in or out.
    DisposableEffect(auth) {
        val listener = FirebaseAuth.AuthStateListener { firebaseAuth ->
            userUid = firebaseAuth.currentUser?.uid
        }
        auth.addAuthStateListener(listener)
        onDispose { auth.removeAuthStateListener(listener) }
    }

    if (userUid == null) {
        AuthScreen(
            isLoading = isAuthLoading,
            errorMessage = authError,
            onAuthenticate = { email, password, createAccount ->
                if (!isAuthLoading) {
                    authError = null
                    isAuthLoading = true

                    val task = if (createAccount) {
                        auth.createUserWithEmailAndPassword(email, password)
                    } else {
                        auth.signInWithEmailAndPassword(email, password)
                    }

                    task.addOnCompleteListener { result ->
                        isAuthLoading = false
                        if (result.isSuccessful) {
                            authError = null
                            // The auth state listener shows the financial screen.
                        } else {
                            authError = result.exception?.localizedMessage
                                ?: "Authentication failed. Check your details and try again."
                        }
                    }
                }
            }
        )
        return
    }

    val signedInUid = userUid ?: return

    fun signOut() {
        auth.signOut()
        currentScreen = "financial"
        applicationId = ""
        application = MortgageApplication()
        submissionError = null
        authError = null
    }

    when (currentScreen) {
        "financial" -> FinancialDetailsScreen(
            signedInEmail = auth.currentUser?.email ?: "",
            onSignOut = { signOut() },
            onContinue = { income, monthlyDebt, deposit, term ->
                application = application.copy(
                    annualIncome = income,
                    monthlyDebtRepayments = monthlyDebt,
                    depositAmount = deposit,
                    mortgageTerm = term
                )
                submissionError = null
                currentScreen = "property"
            }
        )

        "property" -> PropertyDetailsScreen(
            isSubmitting = isSubmitting,
            submissionError = submissionError,
            onSubmit = { town, county, size, rooms, type, ber ->
                if (!isSubmitting) {
                    // Ensure the same user is still signed in when submitting.
                    val activeUser = auth.currentUser
                    if (activeUser == null || activeUser.uid != signedInUid) {
                        submissionError = "Please sign in again before submitting."
                    } else {
                        isSubmitting = true
                        submissionError = null

                        val completedApplication = application.copy(
                            town = town,
                            county = county,
                            propertySize = size,
                            bedrooms = rooms,
                            propertyType = type,
                            berRating = ber
                        )
                        application = completedApplication

                        // Use Sam's exact Firestore collection and field names.
                        val applicationData = hashMapOf<String, Any>(
                            "borrowerID" to activeUser.uid,
                            "status" to "Applied",
                            "propertyDetails" to hashMapOf<String, Any>(
                                "town" to completedApplication.town,
                                "county" to completedApplication.county,
                                "bedrooms" to completedApplication.bedrooms,
                                "propertyType" to completedApplication.propertyType,
                                "berRating" to completedApplication.berRating,
                                "floorAreaSqm" to completedApplication.propertySize
                            ),
                            "financialDetails" to hashMapOf<String, Any>(
                                "annualIncome" to completedApplication.annualIncome,
                                "monthlyDebtRepayments" to completedApplication.monthlyDebtRepayments,
                                "depositEuro" to completedApplication.depositAmount,
                                "mortgageTermYears" to completedApplication.mortgageTerm
                            )
                        )

                        // add() creates the document with an automatic Firestore ID.
                        firestore.collection("application").add(applicationData)
                            .addOnSuccessListener { savedDocument ->
                                applicationId = savedDocument.id
                                isSubmitting = false
                                currentScreen = "status"
                            }
                            .addOnFailureListener { error ->
                                isSubmitting = false
                                submissionError = "Could not save application: " +
                                        (error.localizedMessage ?: "Check your Firebase access.")
                            }
                    }
                }
            }
        )

        "status" -> ApplicationStatusScreen(
            applicationId = applicationId,
            onNewApplication = {
                application = MortgageApplication()
                applicationId = ""
                currentScreen = "financial"
            },
            onSignOut = { signOut() }
        )
    }
}

@Composable
fun AuthScreen(
    isLoading: Boolean,
    errorMessage: String?,
    onAuthenticate: (String, String, Boolean) -> Unit
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var createAccount by remember { mutableStateOf(false) }
    var localError by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(36.dp))
        Text("Agentic Lender", fontSize = 28.sp)
        Spacer(modifier = Modifier.height(8.dp))
        Text(if (createAccount) "Create Borrower Account" else "Borrower Sign In", fontSize = 20.sp)
        Spacer(modifier = Modifier.height(28.dp))

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email Address") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        val displayedError = localError ?: errorMessage
        if (displayedError != null) {
            Spacer(modifier = Modifier.height(12.dp))
            Text(displayedError, color = MaterialTheme.colorScheme.error)
        }

        Spacer(modifier = Modifier.height(24.dp))
        Button(
            onClick = {
                val cleanEmail = email.trim()
                if (!Patterns.EMAIL_ADDRESS.matcher(cleanEmail).matches() || password.length < 6) {
                    localError = "Enter a valid email and password (at least 6 characters)."
                } else {
                    localError = null
                    onAuthenticate(cleanEmail, password, createAccount)
                }
            },
            enabled = !isLoading,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(if (isLoading) "Please wait..." else if (createAccount) "Create Account" else "Sign In")
        }
        Spacer(modifier = Modifier.height(12.dp))
        TextButton(
            onClick = {
                createAccount = !createAccount
                localError = null
            },
            enabled = !isLoading
        ) {
            Text(if (createAccount) "Already have an account? Sign In" else "No account? Create One")
        }
    }
}


@Composable
fun FinancialDetailsScreen(
    signedInEmail: String,
    onSignOut: () -> Unit,
    onContinue: (Double, Double, Double, Int) -> Unit
) {
    var annualIncome by remember { mutableStateOf("") }
    var monthlyDebt by remember { mutableStateOf("") }
    var depositAmount by remember { mutableStateOf("") }
    var mortgageTerm by remember { mutableStateOf("") }

    // Show exactly which input needs correcting
    var errorMessage by remember { mutableStateOf("") }

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

        if (signedInEmail.isNotBlank()) {
            Spacer(modifier = Modifier.height(8.dp))
            Text("Signed in: $signedInEmail", fontSize = 12.sp)
        }

        TextButton(onClick = onSignOut) {
            Text("Sign Out")
        }

        Spacer(modifier = Modifier.height(22.dp))

        OutlinedTextField(
            value = annualIncome,
            onValueChange = {
                annualIncome = it
                errorMessage = ""
            },
            label = { Text("Annual Gross Income (€)") },
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Decimal
            ),
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = monthlyDebt,
            onValueChange = {
                monthlyDebt = it
                errorMessage = ""
            },
            label = { Text("Monthly Debt Repayments (€)") },
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Decimal
            ),
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = depositAmount,
            onValueChange = {
                depositAmount = it
                errorMessage = ""
            },
            label = { Text("Deposit Amount (€)") },
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Decimal
            ),
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = mortgageTerm,
            onValueChange = {
                mortgageTerm = it
                errorMessage = ""
            },
            label = { Text("Mortgage Term (Years)") },
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Number
            ),
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        if (errorMessage.isNotEmpty()) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                errorMessage,
                color = MaterialTheme.colorScheme.error
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        Button(
            onClick = {
                // Remove extra spaces before converting
                val income = annualIncome.trim().toDoubleOrNull()
                val debt = monthlyDebt.trim().toDoubleOrNull()
                val deposit = depositAmount.trim().toDoubleOrNull()
                val term = mortgageTerm.trim().toIntOrNull()

                // Identify the specific invalid field
                errorMessage = when {
                    income == null || !income.isFinite() || income <= 0 ->
                        "Enter a valid annual income."

                    debt == null || !debt.isFinite() || debt < 0 ->
                        "Enter valid monthly debt repayments (0 is allowed)."

                    deposit == null || !deposit.isFinite() || deposit < 0 ->
                        "Enter a valid deposit amount."

                    term == null || term <= 0 ->
                        "Enter a valid mortgage term in whole years."

                    else -> ""
                }

                // Continue only when every value is valid
                if (errorMessage.isEmpty()) {
                    onContinue(
                        income!!,
                        debt!!,
                        deposit!!,
                        term!!
                    )
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Continue")
        }
    }
}

@Composable
fun PropertyDetailsScreen(
    isSubmitting: Boolean,
    submissionError: String?,
    onSubmit: (String, String, Double, Int, String, String) -> Unit
) {
    var town by remember { mutableStateOf("") }
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
            value = town,
            onValueChange = { town = it },
            label = { Text("Town (e.g. Killarney)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedTextField(
            value = county,
            onValueChange = { county = it },
            label = { Text("County (e.g. Kerry)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedTextField(
            value = propertySize,
            onValueChange = { propertySize = it },
            label = { Text("Floor Area (m²)") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedTextField(
            value = bedrooms,
            onValueChange = { bedrooms = it },
            label = { Text("Bedrooms") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedTextField(
            value = propertyType,
            onValueChange = { propertyType = it },
            label = { Text("Property Type (e.g. semi_detached_house)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedTextField(
            value = berRating,
            onValueChange = { berRating = it },
            label = { Text("BER Rating (e.g. B2)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        if (showError) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "Complete all fields using valid numbers for floor area and bedrooms.",
                color = MaterialTheme.colorScheme.error
            )
        }
        if (submissionError != null) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(submissionError, color = MaterialTheme.colorScheme.error)
        }

        Spacer(modifier = Modifier.height(24.dp))
        Button(
            onClick = {
                val size = propertySize.toDoubleOrNull()
                val rooms = bedrooms.toIntOrNull()

                if (
                    town.isBlank() || county.isBlank() ||
                    size == null || !size.isFinite() || size <= 0 ||
                    rooms == null || rooms <= 0 ||
                    propertyType.isBlank() || berRating.isBlank()
                ) {
                    showError = true
                } else {
                    showError = false
                    onSubmit(
                        town.trim(), county.trim(), size, rooms,
                        propertyType.trim(), berRating.trim()
                    )
                }
            },
            enabled = !isSubmitting,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(if (isSubmitting) "Saving to Firebase..." else "Submit Application")
        }
    }
}

@Composable
fun ApplicationStatusScreen(
    applicationId: String,
    onNewApplication: () -> Unit,
    onSignOut: () -> Unit
) {
    var currentStatus by remember(applicationId) { mutableStateOf("Applied") }
    var estimatedValue by remember(applicationId) { mutableStateOf<Double?>(null) }
    var dtiPercent by remember(applicationId) { mutableStateOf<Double?>(null) }
    var assessmentStatus by remember(applicationId) { mutableStateOf<String?>(null) }
    var loadError by remember(applicationId) { mutableStateOf<String?>(null) }

    // Read this specific document and listen for later AI/underwriter updates.
    DisposableEffect(applicationId) {
        val listener = FirebaseFirestore.getInstance()
            .collection("application")
            .document(applicationId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    loadError = "Could not load updates: ${error.localizedMessage}"
                } else if (snapshot != null && snapshot.exists()) {
                    currentStatus = snapshot.getString("status") ?: "Applied"

                    // These fields will appear once Thomas's AI updates the record.
                    val valuation = snapshot.get("valuation") as? Map<*, *>
                    val affordability = snapshot.get("affordability") as? Map<*, *>
                    estimatedValue = (valuation?.get("estimated_value_eur") as? Number)?.toDouble()
                    dtiPercent = (affordability?.get("debt_to_income_percent") as? Number)?.toDouble()
                    assessmentStatus = affordability?.get("assessment_status") as? String
                    loadError = null
                } else {
                    loadError = "Application not found in Firebase."
                }
            }

        onDispose { listener.remove() }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Agentic Lender", fontSize = 28.sp)
        Spacer(modifier = Modifier.height(8.dp))
        Text("Application Status", fontSize = 20.sp)
        Spacer(modifier = Modifier.height(24.dp))

        Text("Firestore Document ID")
        Text(applicationId)
        Spacer(modifier = Modifier.height(24.dp))

        Text("Current Status")
        Text(currentStatus, fontSize = 24.sp)
        Spacer(modifier = Modifier.height(24.dp))

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text("Estimated Property Value")
                Text(
                    estimatedValue?.let { "€${String.format(Locale.getDefault(), "%,.0f", it)}" }
                        ?: "Pending AI valuation"
                )
                Spacer(modifier = Modifier.height(12.dp))

                Text("Annual Debt Repayments / Income")
                Text(
                    dtiPercent?.let { "${String.format(Locale.getDefault(), "%.2f", it)}%" }
                        ?: "Pending affordability calculation"
                )
                Spacer(modifier = Modifier.height(12.dp))

                Text("AI Assessment")
                Text(assessmentStatus ?: "Pending")
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
        Text("An AI assessment is not a mortgage approval.")

        if (loadError != null) {
            Spacer(modifier = Modifier.height(16.dp))
            Text(loadError ?: "", color = MaterialTheme.colorScheme.error)
        }

        Spacer(modifier = Modifier.height(20.dp))
        Button(onClick = onNewApplication, modifier = Modifier.fillMaxWidth()) {
            Text("Start New Application")
        }
        TextButton(onClick = onSignOut) { Text("Sign Out") }
    }
}
