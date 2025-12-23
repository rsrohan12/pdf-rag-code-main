import mongoose from "mongoose";

const pdfSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    originalName: {
      type: String,
      required: true,
    },

    filePath: {
      type: String,
      required: true,
      unique: true,
    },

    pdfUrl: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Pdf = mongoose.model("Pdf", pdfSchema);
