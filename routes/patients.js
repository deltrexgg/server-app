
const express = require("express");
const axios = require("axios");
const Patient = require("../models/Patient");

const router = express.Router();

// POST /api/patients/sync
router.post("/sync", async (req, res) => {
    try {
        const allPatients = [];
        let pageNo = 0;
        let totalCount = Infinity;

        // Fetch all data in API 
        while (allPatients.length < totalCount) {
            const response = await axios.get(process.env.API_URL, {
                params: {
                    user_id: process.env.API_USER_ID,
                    clinic_id: process.env.API_CLINIC_ID,
                    page_no: pageNo,
                },
                auth: {
                    username: process.env.API_USERNAME,
                    password: process.env.API_PASSWORD,
                },
                timeout: 15000,
            });

            const result = response.data;
            const patients = result.result;

            if (!Array.isArray(patients)) {
                return res.status(502).json({
                    message: "External API returned an unexpected response format",
                });
            }

            if (pageNo === 0) {
                totalCount = Number(result.total_count);

                if (!Number.isFinite(totalCount) || totalCount < 0) {
                    return res.status(502).json({
                        message: "External API returned an invalid total_count",
                    });
                }
            }

            if (patients.length === 0) {
                break;
            }

            allPatients.push(...patients);
            pageNo++;
        }

        // Remove duplicate IDs within the fetched pages.
        const uniquePatients = new Map();

        for (const patient of allPatients) {
            if (
                patient.id === undefined ||
                patient.id === null ||
                patient.id === ""
            ) {
                return res.status(502).json({
                    message: "A patient is missing its unique external ID",
                });
            }

            uniquePatients.set(String(patient.id), patient);
        }

        const patientsToSave = Array.from(uniquePatients.entries());

        if (patientsToSave.length === 0) {
            return res.status(200).json({
                message: "Sync completed. No patients returned.",
                received: 0,
                inserted: 0,
                updated: 0,
            });
        }

        const operations = patientsToSave.map(([id, patient]) => ({
            updateOne: {
                filter: { externalId: id },
                update: { $set: { data: patient } },
                upsert: true,
            },
        }));

        const bulkResult = await Patient.bulkWrite(operations);

        return res.status(200).json({
            message: "Patients synced successfully",
            totalCount,
            received: allPatients.length,
            uniquePatients: patientsToSave.length,
            inserted: bulkResult.upsertedCount,
            updated: bulkResult.modifiedCount,
        });
    } catch (error) {
        console.error("Patient sync failed:", error.message);

        if (axios.isAxiosError(error)) {
            console.error("External API status:", error.response?.status);
            console.error("External API response:", error.response?.data);

            return res.status(502).json({
                message: "External patient API request failed",
                upstreamStatus: error.response?.status || null,
            });
        }

        if (
            error.name === "MongoServerError" ||
            error.name === "MongooseError" ||
            error.name === "MongoNetworkError"
        ) {
            return res.status(503).json({
                message: "Database operation failed",
            });
        }

        return res.status(500).json({
            message: "Patient sync failed",
        });
    }
});

// GET /api/patients
router.get("/", async (req, res) => {
    try {
        const patients = await Patient.find()
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            count: patients.length,
            patients,
        });
    } catch (error) {
        console.error("Fetching patients failed:", error.message);

        return res.status(503).json({
            message: "Could not retrieve patients from the database",
        });
    }
});

module.exports = router;
