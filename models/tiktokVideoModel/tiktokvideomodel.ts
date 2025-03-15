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
  userId: string;
  audioUrl: string;
  script: string;
  images: IImage[];
  captions: ICaptionWord[];
  createdAt: Date;
  updatedAt: Date;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  url?: string;
  disableCaptions?: boolean;
  audioDuration?: number;
  screenRatio?: '1/1' | '16/9' | '9/16' | 'auto';
  captionPreset?: 'BASIC' | 'REVID' | 'HORMOZI' | 'WRAP 1' | 'WRAP 2' | 'FACELESS' | 'ALL';
  captionAlignment?: 'top' | 'middle' | 'bottom';
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
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      trim: true
    },
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
          const disableCaptions = (this as any).disableCaptions;
          if (disableCaptions) return true;
          return captions.every(caption => caption.text.trim().length > 0);
        },
        message: 'Caption text cannot be empty'
      }
    },
    disableCaptions: {
      type: Boolean,
      default: false
    },
    audioDuration: {
      type: Number,
      default: 0
    },
    screenRatio: {
      type: String,
      enum: ['1/1', '16/9', '9/16', 'auto'],
      default: '1/1'
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
TikTokVideoSchema.index({ createdAt: -1 });

// Check if the model exists before creating it
const TikTokVideo = mongoose.models.TikTokVideo || mongoose.model<ITikTokVideo>('TikTokVideo', TikTokVideoSchema);

export default TikTokVideo;
