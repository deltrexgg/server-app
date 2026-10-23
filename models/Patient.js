
const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
    {
        externalId: {
            type: String,
            required: true,
            unique: true,
        },
        data: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Patient", patientSchema);
