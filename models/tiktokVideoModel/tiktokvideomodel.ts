import mongoose, { Document, Schema } from 'mongoose';

// Interface for Image object
interface IImage {
  contextText: string;
  imageUrl: string;
}

// Interface for Caption Word
interface ICaptionWord {
  text: string;
  start: number;
  end: number;
}

// Interface for TikTok Video
export interface ITikTokVideo extends Document {
  audioUrl: string;
  script: string;
  images: IImage[];
  captions: ICaptionWord[];
  createdAt: Date;
  updatedAt: Date;
  title: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  url?: string;
  renderId?: string;
}

// Schema for Image
const ImageSchema = new Schema<IImage>({
  contextText: {
    type: String,
    required: [true, 'Context text is required'],
    trim: true
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required'],
    trim: true
  }
});

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

// Schema for TikTok Video
const TikTokVideoSchema = new Schema<ITikTokVideo>(
  {
    audioUrl: {
      type: String,
      required: [true, 'Audio URL is required'],
      trim: true
    },
    script: {
      type: String,
      required: [true, 'Script is required'],
      trim: true
    },
    images: {
      type: [ImageSchema],
      default: [],
      validate: {
        validator: function(images: IImage[]) {
          return images.length > 0;
        },
        message: 'At least one image is required'
      }
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
    status: {
      type: String,
      enum: ['pending', 'generating', 'completed', 'failed'],
      default: 'pending'
    },
    url: {
      type: String,
      trim: true
    },
    renderId: {
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
TikTokVideoSchema.index({ createdAt: -1 });
TikTokVideoSchema.index({ status: 1 });

// Check if the model exists before creating it
const TikTokVideo = mongoose.models.TikTokVideo || mongoose.model<ITikTokVideo>('TikTokVideo', TikTokVideoSchema);

export default TikTokVideo;
