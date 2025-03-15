import Link from 'next/link';
import { ArrowRight, Video, MessageSquareText, FileText } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
              <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
                <span className="block">AI Videos </span>
                <span className="block text-indigo-600">Generator</span>
              </h1>
              <p className="mt-6 text-base text-gray-500 sm:text-lg md:text-xl">
                Generate viral videos from text, images, pdfs, and audio with AI. Not just for TikTok, but for all your video needs. Get styled captions and voiceovers for your videos.
              </p>
              <div className="mt-10 sm:flex sm:justify-center lg:justify-start">
                <div className="rounded-md shadow">
                  <Link 
                    href="/videocaptions"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10 transition-colors duration-200"
                  >
                    Try it now
                  </Link>
                </div>

              </div>
            </div>
            <div className="mt-12 lg:mt-0 lg:col-span-6">
              <div className="relative mx-auto rounded-lg shadow-xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-indigo-800/40 mix-blend-multiply"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">AI-Powered Tools</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Transform Your Content
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Explore our suite of AI-powered tools to enhance your audio and video content.
            </p>
          </div>

          <div className="mt-12">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {/* Feature 1 */}
              <div className="group relative bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                <div>
                  <span className="inline-flex items-center justify-center p-3 bg-indigo-50 rounded-md text-indigo-700 group-hover:bg-indigo-100 transition-colors duration-200">
                    <Video className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600 transition-colors duration-200">
                    <Link href="/tik-tok-video-gen" className="focus:outline-none">
                      <span className="absolute inset-0" aria-hidden="true"></span>
                      AI TikTok Video Generator
                    </Link>
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Turn text into trendy, viral TikTok videos in a snap. Perfect for content creators looking to save time.
                  </p>
                </div>
                <span className="absolute top-6 right-6 text-indigo-400 group-hover:text-indigo-600 transition-colors duration-200" aria-hidden="true">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </div>

              {/* Feature 2 */}
              <div className="group relative bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                <div>
                  <span className="inline-flex items-center justify-center p-3 bg-indigo-50 rounded-md text-indigo-700 group-hover:bg-indigo-100 transition-colors duration-200">
                    <MessageSquareText className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600 transition-colors duration-200">
                    <Link href="/videocaptions" className="focus:outline-none">
                      <span className="absolute inset-0" aria-hidden="true"></span>
                      Add Caption to Video
                    </Link>
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Generate accurate subtitles in 100+ languages with our AI captions. Make your content accessible to everyone.
                  </p>
                </div>
                <span className="absolute top-6 right-6 text-indigo-400 group-hover:text-indigo-600 transition-colors duration-200" aria-hidden="true">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </div>

              {/* Feature 3 */}
              <div className="group relative bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                <div>
                  <span className="inline-flex items-center justify-center p-3 bg-indigo-50 rounded-md text-indigo-700 group-hover:bg-indigo-100 transition-colors duration-200">
                    <FileText className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600 transition-colors duration-200">
                    <Link href="/pdftobrainrot" className="focus:outline-none">
                      <span className="absolute inset-0" aria-hidden="true"></span>
                      PDF to Brainrot
                    </Link>
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Transform your PDFs into viral brainrot videos with AI voice and trending backgrounds. Stand out from the crowd.
                  </p>
                </div>
                <span className="absolute top-6 right-6 text-indigo-400 group-hover:text-indigo-600 transition-colors duration-200" aria-hidden="true">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}