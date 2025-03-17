'use client';
import {
  ClerkProvider,
  UserButton,
} from '@clerk/nextjs'
import Link from "next/link";
import { useState } from "react";
import VideoHistoryModal from "./(app)/(tools)/tik-tok-video-gen/components/VideoHistoryModal";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import {
  Volume2,
  Video,
  MessageSquareText,
  FileText,
  Languages,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <ClerkProvider>
    <html lang="en">
      <body
        className={`antialiased bg-gray-50`}
      >
        <nav className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center">
                  <Link href="/" className="flex items-center">
                    <span className="ml-2 text-xl font-bold text-gray-900">Galaxy AI Videos</span>
                  </Link>
                </div>
                <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                  <Link
                    href="/"
                    className="text-gray-900 hover:text-indigo-600 inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors duration-200"
                  >
                    Home
                  </Link>
                  
                  {/* Dropdown container */}
                  <div className="relative group">
                    <button
                      className="text-gray-900 hover:text-indigo-600 inline-flex items-center px-1 pt-1 text-sm font-medium group-hover:text-indigo-600 transition-colors duration-200"
                    >
                      <span>Free AI Video Tools</span>
                      <ChevronDown className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:rotate-180" />
                    </button>
                    
                    {/* Dropdown menu */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-[550px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 max-w-[calc(100vw-2rem)]">
                      {/* Arrow pointer */}
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rotate-45 border-t border-l border-gray-200"></div>
                      
                      <div className="relative bg-white rounded-lg shadow-lg border border-gray-200 p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* TikTok Video Generator */}
                        <Link href="/tik-tok-video-gen" className="flex items-start p-4 rounded-lg transition-colors duration-200 hover:bg-indigo-50 group/item">
                          <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 group-hover/item:bg-indigo-200 transition-colors duration-200">
                            <Video className="h-6 w-6" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-900 group-hover/item:text-indigo-700 transition-colors duration-200">AI TikTok Video Generator</p>
                            <p className="mt-1 text-sm text-gray-500">Turn text into trendy, viral TikTok videos in a snap</p>
                          </div>
                        </Link>
                        
                        {/* Video Captions */}
                        <Link href="/videocaptions" className="flex items-start p-4 rounded-lg transition-colors duration-200 hover:bg-indigo-50 group/item">
                          <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 group-hover/item:bg-indigo-200 transition-colors duration-200">
                            <MessageSquareText className="h-6 w-6" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-900 group-hover/item:text-indigo-700 transition-colors duration-200">Add Caption to Video</p>
                            <p className="mt-1 text-sm text-gray-500">Generate subtitles in 100+ languages with AI captions</p>
                          </div>
                        </Link>
                        
                        {/* PDF to Brainrot */}
                        <Link href="/pdftobrainrot" className="flex items-start p-4 rounded-lg transition-colors duration-200 hover:bg-indigo-50 group/item">
                          <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 group-hover/item:bg-indigo-200 transition-colors duration-200">
                            <FileText className="h-6 w-6" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-900 group-hover/item:text-indigo-700 transition-colors duration-200">PDF to Brainrot</p>
                            <p className="mt-1 text-sm text-gray-500">Turn PDFs into viral brainrot videos with AI voice and trending backgrounds</p>
                          </div>
                        </Link>
                        
                        {/* Text to Brainrot */}
                        <Link href="/texttobrainrot" className="flex items-start p-4 rounded-lg transition-colors duration-200 hover:bg-indigo-50 group/item">
                          <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 group-hover/item:bg-indigo-200 transition-colors duration-200">
                            <Languages className="h-6 w-6" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-900 group-hover/item:text-indigo-700 transition-colors duration-200">Text to Brainrot Video Generator</p>
                            <p className="mt-1 text-sm text-gray-500">Turn text into viral brainrot videos with AI voice and trending backgrounds</p>
                          </div>
                        </Link>

                        {/* Tweet to Video */}
                        <Link href="/tweettovideo" className="flex items-start p-4 rounded-lg transition-colors duration-200 hover:bg-indigo-50 group/item">
                          <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 text-indigo-600 group-hover/item:bg-indigo-200 transition-colors duration-200">
                            <MessageSquareText className="h-6 w-6" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-900 group-hover/item:text-indigo-700 transition-colors duration-200">Tweet to Video</p>
                            <p className="mt-1 text-sm text-gray-500">Generate a video from a tweet.</p>
                          </div>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex sm:items-center sm:ml-auto">
                
                <div className="ml-4">
                  <UserButton />
                </div>
              </div>

              {/* Mobile menu button */}
              <div className="flex items-center sm:hidden">
                <button
                  type="button"
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-indigo-600 hover:bg-gray-100 focus:outline-none"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  <span className="sr-only">Open main menu</span>
                  {mobileMenuOpen ? (
                    <X className="block h-6 w-6" />
                  ) : (
                    <Menu className="block h-6 w-6" />
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Mobile menu */}
          <div className={`sm:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}>
            <div className="pt-2 pb-3 space-y-1 border-t border-gray-200">
              <Link
                href="/"
                className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-700 hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              
              {/* Free AI Video Tools Section */}
              <div className="py-1">
                <div className="pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-700">
                   AI Video Tools
                </div>
                <div className="space-y-1 pl-8">
                  <Link
                    href="/tik-tok-video-gen"
                    className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    AI TikTok Video Generator
                  </Link>
                  <Link
                    href="/videocaptions"
                    className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Add Caption to Video
                  </Link>
                  <Link
                    href="/pdftobrainrot"
                    className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    PDF to Brainrot
                  </Link>
                  <Link
                    href="/texttobrainrot"
                    className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Text to Brainrot Video Generator
                  </Link>
                </div>
              </div>
              
              <Link
                href="/test-video-generator"
                className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-700 hover:bg-gray-50 hover:border-indigo-300 hover:text-indigo-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                Test Generator
              </Link>

              <Link
                href="/dashboard"
                className="block w-full text-center px-4 py-2 mx-3 mt-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </nav>

        <VideoHistoryModal 
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
        />

        <Toaster position="top-center" />
        <main>{children}</main>
      </body>
    </html>
    </ClerkProvider>
  );
}
