import { Button } from "@/components/ui/button"
import { loginWithProvider, loginAsGuest } from "./actions"
import { MessageSquare } from "lucide-react"

export default function LoginPage() {
  const googleLogin = loginWithProvider.bind(null, 'google')
  const githubLogin = loginWithProvider.bind(null, 'github')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md p-8 rounded-2xl bg-background/60 backdrop-blur-xl border shadow-2xl relative z-10 flex flex-col items-center">
        <div className="flex aspect-square size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-6">
          <MessageSquare className="size-6" />
        </div>
        
        <h1 className="text-3xl font-bold mb-2 tracking-tight text-center">Welcome Back</h1>
        <p className="text-muted-foreground text-center mb-8">Sign in to sync your chats and access all features.</p>
        
        <div className="w-full space-y-4">
          <form action={googleLogin}>
            <Button type="submit" variant="outline" className="w-full h-12 text-base font-medium flex items-center justify-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" className="fill-current">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 15.02 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                <path d="M1 1h22v22H1z" fill="none"/>
              </svg>
              Continue with Google
            </Button>
          </form>

          <form action={githubLogin}>
            <Button type="submit" variant="outline" className="w-full h-12 text-base font-medium flex items-center justify-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
              Continue with GitHub
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background/60 backdrop-blur-xl px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          <form action={loginAsGuest}>
            <Button type="submit" variant="secondary" className="w-full h-12 text-base font-medium">
              Continue as Guest
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
