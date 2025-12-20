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

    storedName: {
      type: String,
      required: true,
      unique: true,
    },

    url: {
      type: String,
      required: true,
    },

  },
  {
    timestamps: true,
  }
);

export const Pdf =  mongoose.model("Pdf", pdfSchema);
