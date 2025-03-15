import mongoose, { Document, Schema } from 'mongoose';

// Interface for Caption Word
interface ICaptionWord {
  text: string;
  start: number;
  end: number;
}

// Interface for Video Captions
export interface IVideoCaption extends Document {
  userId: string;
  videoUrl: string;
  captions: ICaptionWord[];
  fullText: string;
  createdAt: Date;
  updatedAt: Date;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  captionPreset?: 'BASIC' | 'REVID' | 'HORMOZI' | 'WRAP 1' | 'WRAP 2' | 'FACELESS' | 'ALL';
  captionAlignment?: 'top' | 'middle' | 'bottom';
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
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      trim: true
    },
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
    },
    captionPreset: {
      type: String,
      enum: ["BASIC", "REVID", "HORMOZI", "WRAP 1", "WRAP 2", "FACELESS", "ALL"],
      default: 'BASIC'
    }, 
    captionAlignment: {
      type: String,
      enum: ['top', 'middle', 'bottom'],
      default: 'bottom'
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