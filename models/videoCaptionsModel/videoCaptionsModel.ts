import mongoose, { Document, Schema } from 'mongoose';

// Interface for Caption Word
interface ICaptionWord {
  text: string;
  start: number;
  end: number;
}

// Interface for Video Captions
export interface IVideoCaption extends Document {
  videoUrl: string;
  captions: ICaptionWord[];
  fullText: string;
  createdAt: Date;
  updatedAt: Date;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
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

// Schema for Video Captions
const VideoCaptionsSchema = new Schema<IVideoCaption>(
  {
    videoUrl: {
      type: String,
      required: [true, 'Video URL is required'],
      trim: true
    },
    captions: {
      type: [CaptionWordSchema],
      default: [],
    },
    fullText: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      default: 'Untitled Video',
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    }
  },
  {
    timestamps: true, // Automatically manage createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
VideoCaptionsSchema.index({ createdAt: -1 });

// Check if the model exists before creating it
const VideoCaptions = mongoose.models.VideoCaptions || 
  mongoose.model<IVideoCaption>('VideoCaptions', VideoCaptionsSchema);

export default VideoCaptions; 