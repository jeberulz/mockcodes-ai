'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Loader2, RefreshCw, Eye, Code2, Download } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import CodeAccess from '@/components/CodeAccess'

interface Project {
  id: string
  name: string
  description: string | null
  code_type: string | null
  status: string
  created_at: string
  last_modified_at: string
}

interface PreviewClientProps {
  project: Project
}

interface ArtifactData {
  id: string
  html: string
  css: string
  js: string
  preview_url: string
  created_at: string
}

export default function PreviewClient({ project }: PreviewClientProps) {
  const router = useRouter()
  const [artifact, setArtifact] = useState<ArtifactData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchArtifact()
  }, [project.id])

  const fetchArtifact = async () => {
    try {
      console.log('PreviewClient: Fetching artifact for project:', project.id)
      const response = await fetch(`/api/artifacts/${project.id}`)
      
      console.log('PreviewClient: Artifact API response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('PreviewClient: Artifact API error:', response.status, errorText)
        
        if (response.status === 404) {
          setError('No generated code found for this project')
        } else {
          throw new Error(`Failed to fetch artifact: ${response.status}`)
        }
        return
      }

      const data = await response.json()
      console.log('PreviewClient: Artifact data received:', data)
      setArtifact(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchArtifact()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'processing': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
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
          
          <div className="flex items-center gap-3">
            <Badge className={getStatusColor(project.status)}>
              {project.status}
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-3 text-muted-foreground py-12">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Loading preview...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Preview Content */}
        {artifact && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Live Preview */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Live Preview
                  </CardTitle>
                  <CardDescription>
                    Interactive preview of your generated code
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <iframe
                      srcDoc={artifact.html}
                      className="w-full h-[600px] border-0"
                      title="Code Preview"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  </div>
                  
                  {/* Preview Controls */}
                  <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                    <span>Generated: {new Date(artifact.created_at).toLocaleString()}</span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Code2 className="w-4 h-4 mr-2" />
                        View Source
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Code Access Panel */}
            <div className="space-y-6">
              <CodeAccess 
                projectId={project.id}
                artifact={artifact}
              />
              
              {/* Project Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Created</span>
                    <p className="text-sm">{new Date(project.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Last Modified</span>
                    <p className="text-sm">{new Date(project.last_modified_at).toLocaleDateString()}</p>
                  </div>
                  {project.code_type && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Code Type</span>
                      <p className="text-sm">{project.code_type}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}