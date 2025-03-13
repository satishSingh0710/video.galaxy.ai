import mongoose, { Document, Schema } from 'mongoose';

// Interface for Caption Word - same format as in TikTokVideo model
interface ICaptionWord {
  text: string;
  start: number;
  end: number;
}

// Interface for PDF Brainrot
export interface IPdfBrainrot extends Document {
  pdfUrl: string;
  pdfName: string;
  extractedText: string;
  script: string;
  audioUrl: string;
  captions: ICaptionWord[];
  voiceId: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
}

// Schema for Caption Word
const CaptionWordSchema = new Schema<ICaptionWord>({
  text: {
    type: String,
    required: [true, 'Caption text is required'],
    trim: true
  },
  start: {
    type: Number,
    required: [true, 'Start time is required']
  },
  end: {
    type: Number,
    required: [true, 'End time is required'],
    validate: {
      validator: function(end: number) {
        return end > (this as any).start;
      },
      message: 'End time must be greater than start time'
    }
  }
});

// Schema for PDF Brainrot
const PdfBrainrotSchema = new Schema<IPdfBrainrot>(
  {
    pdfUrl: {
      type: String,
      required: [true, 'PDF URL is required'],
      trim: true
    },
    pdfName: {
      type: String,
      required: [true, 'PDF name is required'],
      trim: true
    },
    extractedText: {
      type: String,
      required: [true, 'Extracted text is required'],
      trim: true
    },
    script: {
      type: String,
      required: [true, 'Script is required'],
      trim: true
    },
    audioUrl: {
      type: String,
      required: [true, 'Audio URL is required'],
      trim: true
    },
    captions: {
      type: [CaptionWordSchema],
      default: [],
      validate: {
        validator: function(captions: ICaptionWord[]) {
          return captions.every(caption => caption.text.trim().length > 0);
        },
        message: 'Caption text cannot be empty'
      }
    },
    voiceId: {
      type: String,
      required: [true, 'Voice ID is required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    videoUrl: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
PdfBrainrotSchema.index({ createdAt: -1 });
PdfBrainrotSchema.index({ status: 1 });

// Check if the model exists before creating it
const PdfBrainrot = mongoose.models.PdfBrainrot || mongoose.model<IPdfBrainrot>('PdfBrainrot', PdfBrainrotSchema);

export default PdfBrainrot;
