import React from 'react';
import {
    AbsoluteFill,
    Audio,
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
    Sequence,
} from 'remotion';

interface VideoCompositionProps {
    audioUrl: string;
    images: Array<{
        imageUrl: string;
        contextText: string;
    }>;
    captions: Array<{
        text: string;
        start: number;
        end: number;
    }>;
}

export const VideoComposition: React.FC<VideoCompositionProps> = ({
    audioUrl,
    images,
    captions,
}) => {
    const { fps, durationInFrames } = useVideoConfig();
    const frame = useCurrentFrame();

    // Debug captions
    React.useEffect(() => {
        console.log('Current frame:', frame);
        console.log('Duration in frames:', durationInFrames);
        console.log('Captions:', captions);
        console.log('Images:', images);
    }, [frame, durationInFrames, captions, images]);

    // Calculate image segment duration
    const imageDuration = Math.floor(durationInFrames / (images.length || 1));

    return (
        <AbsoluteFill style={{ backgroundColor: 'black' }}>
            {/* Images */}
            {images.map((image, index) => (
                <Sequence key={index} from={index * imageDuration} durationInFrames={imageDuration}>
                    <AbsoluteFill>
                        <img
                            src={image.imageUrl}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                            alt={image.contextText}
                        />
                    </AbsoluteFill>
                </Sequence>
            ))}

            {/* Text Overlay - Always visible */}
            <AbsoluteFill 
                style={{
                    zIndex: 99999,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    pointerEvents: 'none',
                }}
            >
                <div
                    style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: '30px',
                        borderRadius: '15px',
                        boxShadow: '0 0 20px rgba(0, 0, 0, 0.9)'
                    }}
                >
                    <h1 
                        style={{
                            color: '#ffffff',
                            fontSize: '8rem',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            textShadow: '4px 4px 8px #000000',
                            margin: 0,
                        }}
                    >
                        THIS HAS TO WORK
                    </h1>
                </div>
            </AbsoluteFill>

            {/* Audio Track */}
            <Audio src={audioUrl} />
        </AbsoluteFill>
    );
};

export default VideoComposition; 