'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Terminal, 
  Code, 
  Download, 
  Copy, 
  Check,
  FileText,
  Braces,
  Palette
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ArtifactData {
  id: string
  html: string
  css: string
  js: string
  preview_url: string
  created_at: string
}

interface CodeAccessProps {
  projectId: string
  artifact: ArtifactData
  className?: string
}

export default function CodeAccess({ projectId, artifact, className = '' }: CodeAccessProps) {
  const [copiedItem, setCopiedItem] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const copyToClipboard = async (text: string, itemId: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedItem(itemId)
    setTimeout(() => setCopiedItem(null), 2000)
  }

  const downloadZip = async () => {
    setIsDownloading(true)
    try {
      const response = await fetch(`/api/artifacts/${projectId}/download`)
      if (!response.ok) throw new Error('Download failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `project-${projectId}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  const cursorCliCommand = `npx create-next-app@latest my-project --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd my-project
# Copy the generated code files to your project
# HTML -> src/app/page.tsx (convert to JSX)
# CSS -> src/app/globals.css (append to existing)
# JS -> src/components/ (create components)`

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Access Your Code
          </CardTitle>
          <CardDescription>
            Choose how you want to use your generated code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="cli" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="cli">CLI Snippet</TabsTrigger>
              <TabsTrigger value="raw">Raw Code</TabsTrigger>
              <TabsTrigger value="download">Download</TabsTrigger>
            </TabsList>
            
            {/* CLI Integration */}
            <TabsContent value="cli" className="space-y-4">
              <Alert>
                <Terminal className="h-4 w-4" />
                <AlertDescription>
                  Perfect for Cursor, VS Code, or any modern IDE with AI assistance
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Setup Command</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(cursorCliCommand, 'cli')}
                    >
                      {copiedItem === 'cli' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto">
                    {cursorCliCommand}
                  </pre>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Badge variant="outline" className="justify-center py-2">
                    <Terminal className="w-4 h-4 mr-2" />
                    Cursor Ready
                  </Badge>
                  <Badge variant="outline" className="justify-center py-2">
                    <Code className="w-4 h-4 mr-2" />
                    VS Code Compatible
                  </Badge>
                </div>
              </div>
            </TabsContent>

            {/* Raw Code */}
            <TabsContent value="raw" className="space-y-4">
              <div className="space-y-4">
                {/* HTML */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm font-medium">HTML</span>
                      <Badge variant="secondary" className="text-xs">
                        {artifact.html.split('\n').length} lines
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(artifact.html, 'html')}
                    >
                      {copiedItem === 'html' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto max-h-40">
                    {artifact.html}
                  </pre>
                </div>

                {/* CSS */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      <span className="text-sm font-medium">CSS</span>
                      <Badge variant="secondary" className="text-xs">
                        {artifact.css.split('\n').length} lines
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(artifact.css, 'css')}
                    >
                      {copiedItem === 'css' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto max-h-40">
                    {artifact.css}
                  </pre>
                </div>

                {/* JavaScript */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Braces className="w-4 h-4" />
                      <span className="text-sm font-medium">JavaScript</span>
                      <Badge variant="secondary" className="text-xs">
                        {artifact.js.split('\n').length} lines
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(artifact.js, 'js')}
                    >
                      {copiedItem === 'js' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-x-auto max-h-40">
                    {artifact.js}
                  </pre>
                </div>
              </div>
            </TabsContent>

            {/* Download */}
            <TabsContent value="download" className="space-y-4">
              <Alert>
                <Download className="h-4 w-4" />
                <AlertDescription>
                  Download a complete project folder with all files organized
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div className="text-center">
                  <Button 
                    onClick={downloadZip}
                    disabled={isDownloading}
                    size="lg"
                    className="w-full"
                  >
                    {isDownloading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Preparing Download...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download ZIP
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p><strong>Includes:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>index.html - Main HTML file</li>
                    <li>styles.css - Tailwind CSS styles</li>
                    <li>script.js - Interactive JavaScript</li>
                    <li>README.md - Setup instructions</li>
                    <li>package.json - Dependencies (if needed)</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}