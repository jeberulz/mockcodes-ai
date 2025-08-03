'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Wand2, Eye, Code, Copy, Check } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PromptEditorProps {
  imageUrl: string
  projectId: string
  onPromptGenerated?: (prompt: string) => void
  onGenerateCode?: (prompt: string) => void
  className?: string
}

interface AnalysisResult {
  prompt: string
  components: string[]
  colors: string[]
  typography: string[]
  layout: string
}

export default function PromptEditor({ 
  imageUrl, 
  projectId,
  onPromptGenerated, 
  onGenerateCode,
  className = '' 
}: PromptEditorProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const analyzeImage = useCallback(async () => {
    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      })

      if (!response.ok) {
        throw new Error('Failed to analyze image')
      }

      const result = await response.json()
      setAnalysis(result)
      setCustomPrompt(result.prompt)
      onPromptGenerated?.(result.prompt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze image')
    } finally {
      setIsAnalyzing(false)
    }
  }, [projectId, onPromptGenerated])

  // Auto-analyze the image when component mounts
  useEffect(() => {
    if (projectId) {
      analyzeImage()
    }
  }, [analyzeImage])

  const handleGenerateCode = async () => {
    if (!customPrompt.trim()) return
    
    setIsGenerating(true)
    setError(null)
    
    try {
      await onGenerateCode?.(customPrompt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate code')
    } finally {
      setIsGenerating(false)
    }
  }

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(customPrompt)
      setCopied(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to copy prompt to clipboard')
    } finally {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Image Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Uploaded Screenshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative aspect-video max-w-md mx-auto bg-gray-100 rounded-lg overflow-hidden">
            <img 
              src={imageUrl} 
              alt="Uploaded UI screenshot" 
              className="w-full h-full object-contain"
            />
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {isAnalyzing && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing UI elements and generating prompt...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {analysis && (
        <>
          {/* Analysis Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                AI Analysis
              </CardTitle>
              <CardDescription>
                Detected UI components and design elements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Components</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.components.map((component, index) => (
                    <Badge key={index} variant="secondary">
                      {component}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Colors</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.colors.map((color, index) => (
                    <Badge key={index} variant="outline">
                      {color}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Typography</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.typography.map((font, index) => (
                    <Badge key={index} variant="outline">
                      {font}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Layout</h4>
                <p className="text-sm text-muted-foreground">{analysis.layout}</p>
              </div>
            </CardContent>
          </Card>

          {/* Prompt Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Generated Prompt
              </CardTitle>
              <CardDescription>
                Review and customize the AI prompt before generating code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="AI-generated prompt will appear here..."
                  className="min-h-[200px] pr-12"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyPrompt}
                  className="absolute top-2 right-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={analyzeImage}
                  variant="outline"
                  disabled={isAnalyzing}
                >
                  {isAnalyzing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Re-analyze Image
                </Button>
                
                <Button 
                  onClick={handleGenerateCode}
                  disabled={!customPrompt.trim() || isGenerating}
                  className="flex-1"
                >
                  {isGenerating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Generate Code
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}