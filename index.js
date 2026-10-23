
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const patientRoutes = require("./routes/patients");

const app = express();

app.use(cors({
    origin: "http://localhost:5173",
}));

app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "Patient API is running" });
});

app.use("/api/patients", patientRoutes);

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        console.log("MongoDB connected successfully");

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error.message);
        process.exit(1);
    }
}

startServer();
