import { auth, currentUser } from '@clerk/nextjs/server'
import { UserButton } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { ensureUserProfile } from '@/utils/supabase/user-profile'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

// Project type definition for strong typing
interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  status: 'active' | 'processing' | 'archived';
  screenshot_url?: string;
  // Allow additional dynamic fields
  [key: string]: any;
}

export default async function DashboardPage() {
  const { userId } = await auth()
  const user = await currentUser()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Ensure user profile exists and get current data
  const userProfile = await ensureUserProfile()

  // Fetch user's projects
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: projectsData, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false }) as { data: any[] | null; error: any };

  // Generate fresh signed URLs for private screenshots
  const projects: Project[] = await Promise.all(
    (projectsData ?? []).map(async (proj: Project) => {
      if (proj.screenshot_url) {
        // Use the full path as stored (already includes screenshots/ prefix)
        const normalizedPath = proj.screenshot_url.replace(/^\/+/, '') // remove leading slashes only
        const { data: signedData } = await supabase.storage
          .from('screenshots')
          .createSignedUrl(normalizedPath, 3600)
        if (signedData?.signedUrl) {
          proj.screenshot_url = signedData.signedUrl
        }
      }
      return proj
    })
  )

  if (projectsError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <h2 className="text-2xl font-semibold mb-2 text-gray-900">Unable to load projects</h2>
        <p className="text-gray-600 mb-6 max-w-md">Something went wrong while fetching your projects. Please refresh the page or try again later.</p>
        <Link href="/dashboard" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Retry
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Mockcodes</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome back, {user?.firstName || 'User'}!
              </div>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10",
                  },
                }}
                showName={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h2>
          <p className="text-gray-600">
            Transform your UI screenshots into working code with AI
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{projects?.length || 0}</div>
              <div className="text-sm text-gray-600">Projects</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {userProfile ? ((userProfile.prompt_quota ?? 15) - (userProfile.prompts_used ?? 0)) : 15}
              </div>
              <div className="text-sm text-gray-600">Prompts Remaining</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {userProfile?.role === 'admin' ? 'Admin' : 'Starter'}
              </div>
              <div className="text-sm text-gray-600">Current Plan</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Your Projects</h2>
            <Link href="/upload" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              + New Project
            </Link>
          </div>
          
          {projects && projects.length > 0 ? (
            <div className="space-y-4">
              {projects.map((project) => (
                <div key={project.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Created {new Date(project.created_at).toLocaleDateString()}
                      </p>
                      {project.description && (
                        <p className="text-sm text-gray-500 mt-1">{project.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        project.status === 'active' ? 'bg-green-100 text-green-800' :
                        project.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {project.status}
                      </span>
                      {project.screenshot_url && (
                        <Link 
                          href={`/project/${project.id}`}
                          className="bg-blue-600 text-white px-3 py-1 text-sm rounded hover:bg-blue-700"
                        >
                          Analyze
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-600 mb-4">Upload your first UI screenshot to get started</p>
              <Link href="/upload" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
                Create Your First Project
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}