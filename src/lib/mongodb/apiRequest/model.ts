import mongoose from "mongoose"

const apiRequest = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    date: { type: Date, default: Date.now },
})

export interface IApiSchema extends mongoose.Document {
    email: string
    date: Date
}

export default mongoose.models.apiRequest ?? mongoose.model("apiSchema", apiRequest)