'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import PromptEditor from '@/components/PromptEditor'

interface Project {
  id: string
  name: string
  description: string | null
  screenshot_url: string | null
  status: string
  created_at: string
  updated_at: string
}

interface ProjectClientProps {
  project: Project
}

export default function ProjectClient({ project }: ProjectClientProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)

  const handlePromptGenerated = (prompt: string) => {
    console.log('Prompt generated:', prompt)
  }

  const handleGenerateCode = async (prompt: string) => {
    if (!prompt.trim()) return
    
    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/scaffold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          projectId: project.id,
          imageUrl: project.screenshot_url,
          preferences: {}
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate code')
      }

      const result = await response.json()
      console.log('Scaffold API response:', result)
      
      if (result.success) {
        console.log('Success! Redirecting to preview with artifact:', result.artifactId)
        // Wait a moment for the artifact to be fully created
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Redirect to preview page with artifact ID
        const previewUrl = `/preview?project=${project.id}&artifact=${result.artifactId}`
        console.log('Redirecting to:', previewUrl)
        router.push(previewUrl)
      } else {
        console.error('Scaffold API returned failure:', result)
        throw new Error(result.error || 'Code generation failed')
      }
    } catch (error) {
      console.error('Code generation error:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate code')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {project.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {project.screenshot_url ? (
          <PromptEditor
            imageUrl={project.screenshot_url}
            projectId={project.id}
            onPromptGenerated={handlePromptGenerated}
            onGenerateCode={handleGenerateCode}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              No screenshot found for this project.
            </p>
            <Button 
              onClick={() => router.push('/dashboard')}
              className="mt-4"
            >
              Back to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}